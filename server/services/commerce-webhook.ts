import { createHash } from "node:crypto";
import { and, eq, inArray, isNull, like, notInArray, or, sql } from "drizzle-orm";
import type Stripe from "stripe";
import db from "../../db/client";
import {
  commerceOrderHistory,
  commerceOrders,
  commercePayments,
  commerceSubscriptions,
  commerceWebhookEvents,
  cosmeticEntitlements,
} from "../../db/schema";
import {
  assertStripeLivemode,
  productIdentityFromLookupKey,
  stripeClient,
  type CommerceMode,
} from "../utils/stripe-commerce";
import {
  authoritativeSubscriptionOrderStatus,
  canRestoreSubscriptionDispute,
  canRestoreWonDispute,
  immutableOrderGrants,
  invoiceEntitlementSource,
  orderStatusAfterRefund,
  preserveTerminalSubscriptionOrderStatus,
  shouldGrantInvoiceCoverage,
  subscriptionOrderStatus,
  synchronizedSubscriptionOrderStatus,
} from "../utils/commerce-transitions";

class UnrelatedStripeObjectError extends Error {}

type StripeObject = Record<string, any> & { id: string; metadata?: Record<string, string> };
type CommerceTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface ClaimedEvent extends Record<string, unknown> {
  stripe_event_id: string;
  event_type: string;
  livemode: boolean;
  attempts: number;
  lock_token: string;
}

function stripeId(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return null;
}

function stripeDate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1_000) : null;
}

function metadataCandidates(object: StripeObject) {
  return [
    object.metadata,
    object.subscription_details?.metadata,
    object.parent?.subscription_details?.metadata,
    object._subscription?.metadata,
    object._charge?.metadata,
    object._paymentIntent?.metadata,
    object._invoice?.metadata,
    object._invoice?.parent?.subscription_details?.metadata,
    object._invoice?._subscription?.metadata,
    object.payment_intent?.metadata,
  ].filter(Boolean) as Array<Record<string, string>>;
}

function orderIdFromMetadata(object: StripeObject) {
  for (const metadata of metadataCandidates(object)) {
    const value = metadata.cookiebuild_order_id;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "")) return value;
  }
  return null;
}

function productIdentityFromObject(object: StripeObject) {
  let metadataIdentity: { productId: string; productVersion: number | null } | null = null;
  for (const metadata of metadataCandidates(object)) {
    if (metadata.cookiebuild_product_id) {
      const version = Number(metadata.cookiebuild_product_version);
      metadataIdentity = {
        productId: metadata.cookiebuild_product_id,
        productVersion: Number.isSafeInteger(version) && version > 0 ? version : null,
      };
      if (metadataIdentity.productVersion !== null) return metadataIdentity;
    }
  }
  const lineItems = object.line_items?.data || object.lines?.data || [];
  for (const line of lineItems) {
    const lookupKey = line.price?.lookup_key || line.pricing?.price_details?.price?.lookup_key;
    const identity = productIdentityFromLookupKey(lookupKey);
    if (identity) return identity;
  }
  return metadataIdentity;
}

async function retrieveInvoiceWithDetails(client: Stripe, id: string) {
  const invoice = await client.invoices.retrieve(id, { expand: ["payments"] }) as unknown as StripeObject;
  for (const line of invoice.lines?.data || []) {
    const priceValue = line.price || line.pricing?.price_details?.price;
    const priceId = stripeId(priceValue);
    if (priceId && typeof priceValue === "string") {
      line._price = await client.prices.retrieve(priceId, { expand: ["product"] }) as unknown as StripeObject;
    } else if (priceValue && typeof priceValue === "object") {
      line._price = priceValue;
    }
  }
  const subscriptionId = stripeId(invoice.subscription)
    || stripeId(invoice.parent?.subscription_details?.subscription);
  if (subscriptionId) invoice._subscription = await client.subscriptions.retrieve(subscriptionId) as unknown as StripeObject;
  return invoice;
}

async function attachChargeDetails(client: Stripe, object: StripeObject) {
  const chargeId = stripeId(object.charge);
  if (!chargeId) return;
  const charge = typeof object.charge === "object" ? object.charge : await client.charges.retrieve(chargeId);
  object._charge = charge;
  const paymentIntentId = stripeId(charge.payment_intent);
  if (paymentIntentId) object._paymentIntent = await client.paymentIntents.retrieve(paymentIntentId);
  let invoiceId = stripeId(charge.invoice);
  // Current Stripe APIs moved Charge.invoice to the Invoice Payments mapping.
  if (!invoiceId && paymentIntentId) {
    const mappings = await client.invoicePayments.list({ payment: { type: "payment_intent", payment_intent: paymentIntentId }, limit: 10 });
    const invoices = [...new Set(mappings.data.map((item) => stripeId(item.invoice)).filter(Boolean))];
    if (mappings.has_more || invoices.length > 1) throw new Error("Ambiguous invoice mapping for commerce payment");
    invoiceId = invoices[0] || null;
  }
  if (invoiceId) {
    charge.invoice = invoiceId;
    object._invoice = await retrieveInvoiceWithDetails(client, invoiceId);
  }
}

async function currentStripeObject(client: Stripe, event: Stripe.Event): Promise<StripeObject> {
  const snapshot = event.data.object as unknown as StripeObject;
  const id = snapshot.id;
  if (event.type.startsWith("checkout.session.")) {
    return await client.checkout.sessions.retrieve(id, {
      expand: ["line_items.data.price.product", "payment_intent", "subscription"],
    }) as unknown as StripeObject;
  }
  if (event.type.startsWith("invoice.")) {
    return retrieveInvoiceWithDetails(client, id);
  }
  if (event.type.startsWith("customer.subscription.")) {
    return await client.subscriptions.retrieve(id) as unknown as StripeObject;
  }
  if (event.type.startsWith("refund.")) {
    const refund = await client.refunds.retrieve(id) as unknown as StripeObject;
    await attachChargeDetails(client, refund);
    return refund;
  }
  if (event.type.startsWith("charge.dispute.")) {
    const dispute = await client.disputes.retrieve(id, { expand: ["charge"] }) as unknown as StripeObject;
    await attachChargeDetails(client, dispute);
    return dispute;
  }
  return snapshot;
}

async function resolveOrder(tx: CommerceTx, object: StripeObject) {
  const assertMode = (order: typeof commerceOrders.$inferSelect) => {
    if (typeof object._eventLivemode === "boolean" && order.stripeMode !== (object._eventLivemode ? "live" : "test")) {
      throw new Error(`Stripe event mode conflicts with order ${order.id}`);
    }
    const customerId = stripeId(object.customer) || stripeId(object._charge?.customer);
    if (customerId && order.stripeCustomerId && customerId !== order.stripeCustomerId) {
      throw new Error("Stripe customer conflicts with recorded order ownership");
    }
    for (const metadata of metadataCandidates(object)) {
      if (metadata.cookiebuild_player_id && metadata.cookiebuild_player_id !== order.playerId) {
        throw new Error("Stripe player identity conflicts with recorded order ownership");
      }
    }
    if ((object.object === "checkout.session" || object.id.startsWith("cs_"))
      && order.stripeCheckoutSessionId && order.stripeCheckoutSessionId !== object.id) {
      throw new Error("Stripe Checkout session conflicts with recorded order");
    }
    const identity = productIdentityFromObject(object);
    if (identity && (identity.productId !== order.productId || identity.productVersion !== order.productVersion)) {
      throw new Error(`Stripe product identity conflicts with recorded order ${order.id}`);
    }
    return order;
  };
  const metadataOrderId = orderIdFromMetadata(object);
  if (metadataOrderId) {
    const [order] = await tx.select().from(commerceOrders).where(eq(commerceOrders.id, metadataOrderId)).limit(1).for("update");
    if (order) {
      return assertMode(order);
    }
  }

  const subscriptionId = stripeId(object.subscription) || stripeId(object._subscription)
    || stripeId(object.parent?.subscription_details?.subscription);
  if (subscriptionId) {
    const [order] = await tx.select().from(commerceOrders)
      .where(eq(commerceOrders.stripeSubscriptionId, subscriptionId)).limit(1).for("update");
    if (order) return assertMode(order);
  }
  if (object.object === "checkout.session" || object.id.startsWith("cs_")) {
    const [order] = await tx.select().from(commerceOrders)
      .where(eq(commerceOrders.stripeCheckoutSessionId, object.id)).limit(1).for("update");
    if (order) return assertMode(order);
  }

  const paymentIntentId = stripeId(object.payment_intent) || stripeId(object._charge?.payment_intent);
  const chargeId = stripeId(object.charge) || stripeId(object._charge);
  const invoiceId = object.id.startsWith("in_") ? object.id : stripeId(object.invoice) || stripeId(object._charge?.invoice);
  const paymentConditions = [];
  if (paymentIntentId) paymentConditions.push(eq(commercePayments.stripePaymentIntentId, paymentIntentId));
  if (chargeId) paymentConditions.push(eq(commercePayments.stripeChargeId, chargeId));
  if (invoiceId) paymentConditions.push(eq(commercePayments.stripeInvoiceId, invoiceId));
  if (paymentConditions.length) {
    const [row] = await tx.select({ order: commerceOrders }).from(commercePayments)
      .innerJoin(commerceOrders, eq(commerceOrders.id, commercePayments.orderId))
      .where(or(...paymentConditions)).limit(1).for("update");
    if (row?.order) return assertMode(row.order);
  }
  if (!metadataOrderId && !productIdentityFromObject(object)) throw new UnrelatedStripeObjectError("Stripe object is outside Cookie Build commerce");
  throw new Error(`Unable to resolve Cookie Build order for Stripe object ${object.id}`);
}

function orderGrants(order: typeof commerceOrders.$inferSelect) {
  try {
    return immutableOrderGrants(order.access, order.grantsSnapshot);
  } catch {
    throw new Error(`Recorded order ${order.id} has an invalid immutable grant snapshot`);
  }
}

async function addHistory(
  tx: CommerceTx,
  orderId: string,
  eventId: string,
  kind: string,
  status: string,
  amountCents: number | null = null,
  details: Record<string, unknown> = {},
  occurredAt = new Date(),
) {
  await tx.insert(commerceOrderHistory).values({
    orderId,
    dedupeKey: `${eventId}:${kind}`,
    eventId,
    kind,
    status,
    amountCents,
    details,
    occurredAt,
  }).onConflictDoNothing();
}

async function grantOrder(tx: CommerceTx, order: typeof commerceOrders.$inferSelect, expiresAt: Date | null, source = order.entitlementSource) {
  const grants = orderGrants(order);
  if (order.access === "subscription" && !expiresAt) throw new Error("Subscription grant requires an expiry");
  for (const cosmeticId of grants) {
    await tx.insert(cosmeticEntitlements).values({
      playerId: order.playerId,
      cosmeticId,
      source,
      grantedAt: new Date(),
      expiresAt,
      revokedAt: null,
    }).onConflictDoUpdate({
      target: [cosmeticEntitlements.playerId, cosmeticEntitlements.cosmeticId, cosmeticEntitlements.source],
      set: {
        expiresAt: sql`CASE
          WHEN ${cosmeticEntitlements.revokedAt} IS NOT NULL THEN ${cosmeticEntitlements.expiresAt}
          WHEN ${cosmeticEntitlements.expiresAt} IS NULL OR excluded.expires_at IS NULL THEN NULL
          ELSE greatest(${cosmeticEntitlements.expiresAt}, excluded.expires_at)
        END`,
      },
    });
  }
}

async function revokeOrderSource(tx: CommerceTx, order: typeof commerceOrders.$inferSelect, now = new Date()) {
  return revokeEntitlementSource(tx, order, order.entitlementSource, now);
}

async function revokeEntitlementSource(tx: CommerceTx, order: typeof commerceOrders.$inferSelect, source: string | null, now = new Date()) {
  if (!source) return;
  for (const cosmeticId of orderGrants(order)) {
    await tx.insert(cosmeticEntitlements).values({
      playerId: order.playerId,
      cosmeticId,
      source,
      grantedAt: now,
      expiresAt: null,
      revokedAt: now,
    }).onConflictDoUpdate({
      target: [cosmeticEntitlements.playerId, cosmeticEntitlements.cosmeticId, cosmeticEntitlements.source],
      set: { revokedAt: sql`coalesce(${cosmeticEntitlements.revokedAt}, excluded.revoked_at)` },
    });
  }
}

async function revokeAllOrderSources(tx: CommerceTx, order: typeof commerceOrders.$inferSelect, now = new Date()) {
  await tx.update(cosmeticEntitlements).set({ revokedAt: now }).where(and(
    eq(cosmeticEntitlements.playerId, order.playerId),
    or(
      eq(cosmeticEntitlements.source, order.entitlementSource),
      like(cosmeticEntitlements.source, `stripe:invoice:${order.id}:%`),
      like(cosmeticEntitlements.source, `stripe:restore:${order.id}:%`),
    ),
    isNull(cosmeticEntitlements.revokedAt),
  ));
}


function subscriptionPeriodEnd(subscription: StripeObject) {
  const timestamps = [
    subscription.current_period_end,
    ...(subscription.items?.data || []).map((item: StripeObject) => item.current_period_end),
  ].filter((value): value is number => typeof value === "number");
  return timestamps.length ? new Date(Math.max(...timestamps) * 1_000) : null;
}

async function upsertSubscription(tx: CommerceTx, order: typeof commerceOrders.$inferSelect, subscription: StripeObject) {
  const periodEnd = subscriptionPeriodEnd(subscription);
  const status = String(subscription.status || "unknown").slice(0, 32);
  const endedAt = stripeDate(subscription.ended_at);
  await tx.insert(commerceSubscriptions).values({
    stripeSubscriptionId: subscription.id,
    orderId: order.id,
    playerId: order.playerId,
    productId: order.productId,
    status,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    endedAt,
  }).onConflictDoUpdate({
    target: commerceSubscriptions.stripeSubscriptionId,
    set: {
      status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
      endedAt,
      updatedAt: new Date(),
    },
  });
  const orderState = subscriptionOrderStatus(status, subscription.cancel_at_period_end === true);
  const synchronizedOrderStatus = synchronizedSubscriptionOrderStatus(order.status, status, subscription.cancel_at_period_end === true);
  if (orderState === "terminal") {
    await revokeAllOrderSources(tx, order);
    await tx.update(commerceOrders).set({ status: synchronizedOrderStatus, canceledAt: endedAt || new Date(), updatedAt: new Date() })
      .where(eq(commerceOrders.id, order.id));
  } else {
    await tx.update(commerceOrders).set({
      stripeSubscriptionId: subscription.id,
      status: synchronizedOrderStatus,
      updatedAt: new Date(),
    }).where(eq(commerceOrders.id, order.id));
  }
  return periodEnd;
}

function invoicePaymentIntent(invoice: StripeObject) {
  return stripeId(invoice.payment_intent)
    || stripeId(invoice.payments?.data?.[0]?.payment?.payment_intent)
    || stripeId(invoice.payments?.data?.[0]?.payment_intent);
}

function assertCheckoutSnapshotContract(session: StripeObject, order: typeof commerceOrders.$inferSelect) {
  const lines = session.line_items?.data || [];
  const matchingLines = lines.filter((line: StripeObject) => {
    const price = line.price || line.pricing?.price_details?.price;
    const identity = productIdentityFromLookupKey(price?.lookup_key);
    return identity?.productId === order.productId && identity.productVersion === order.productVersion;
  });
  if (matchingLines.length !== 1 || lines.length !== 1) {
    throw new Error(`Checkout ${session.id} does not contain exactly one line matching order snapshot ${order.id}`);
  }
  const line = matchingLines[0];
  const price = line.price || line.pricing?.price_details?.price;
  const recurring = order.access === "subscription";
  if (line.quantity !== 1
    || price?.currency?.toUpperCase() !== order.currency
    || price?.unit_amount !== order.amountTtcCents
    || (recurring ? price?.type !== "recurring" : price?.type !== "one_time")) {
    throw new Error(`Checkout ${session.id} line contract conflicts with order snapshot ${order.id}`);
  }
}

function invoiceCharge(invoice: StripeObject) {
  return stripeId(invoice.charge)
    || stripeId(invoice.payments?.data?.[0]?.payment?.charge)
    || stripeId(invoice.payments?.data?.[0]?.charge);
}

function invoiceCoverage(invoice: StripeObject, order: typeof commerceOrders.$inferSelect) {
  const matches = (invoice.lines?.data || []).filter((line: StripeObject) => {
    const price = line._price || line.price || line.pricing?.price_details?.price;
    const lookupIdentity = productIdentityFromLookupKey(price?.lookup_key);
    const metadataVersion = Number(price?.product?.metadata?.cookiebuild_product_version);
    const metadataIdentity = price?.product?.metadata?.cookiebuild_product_id && Number.isSafeInteger(metadataVersion)
      ? { productId: price.product.metadata.cookiebuild_product_id, productVersion: metadataVersion }
      : null;
    const identity = lookupIdentity || metadataIdentity;
    return identity?.productId === order.productId && identity.productVersion === order.productVersion;
  });
  if (matches.length !== 1) throw new Error(`Invoice ${invoice.id} does not contain exactly one line matching order snapshot ${order.id}`);
  const line = matches[0];
  const price = line._price || line.price || line.pricing?.price_details?.price;
  if (line.quantity !== 1
    || price.currency?.toUpperCase() !== order.currency
    || price.unit_amount !== order.amountTtcCents
    || price.type !== "recurring") {
    throw new Error(`Invoice ${invoice.id} price contract conflicts with order ${order.id}`);
  }
  const periodEnd = stripeDate(line.period?.end);
  if (!periodEnd) throw new Error(`Invoice ${invoice.id} is missing its billed coverage period`);
  return periodEnd;
}

async function upsertPayment(tx: CommerceTx, orderId: string, values: {
  paymentIntentId?: string | null;
  chargeId?: string | null;
  invoiceId?: string | null;
  amountCents: number;
  refundedAmountCents?: number;
  currency: string;
  status: string;
  paidAt?: Date | null;
  entitlementSource?: string | null;
  coverageExpiresAt?: Date | null;
}) {
  if (values.amountCents <= 0) return null;
  const conditions = [];
  if (values.paymentIntentId) conditions.push(eq(commercePayments.stripePaymentIntentId, values.paymentIntentId));
  if (values.chargeId) conditions.push(eq(commercePayments.stripeChargeId, values.chargeId));
  if (values.invoiceId) conditions.push(eq(commercePayments.stripeInvoiceId, values.invoiceId));
  const [existing] = conditions.length
    ? await tx.select().from(commercePayments).where(or(...conditions)).limit(1)
    : [];
  if (existing) {
    if (existing.orderId !== orderId) throw new Error("Stripe payment is already owned by another order");
    const refunded = Math.max(existing.refundedAmountCents, values.refundedAmountCents || 0);
    const terminalPaymentStatus = ["refunded", "partially_refunded", "disputed", "dispute_lost"].includes(existing.status);
    const [updated] = await tx.update(commercePayments).set({
      stripePaymentIntentId: values.paymentIntentId || existing.stripePaymentIntentId,
      stripeChargeId: values.chargeId || existing.stripeChargeId,
      stripeInvoiceId: values.invoiceId || existing.stripeInvoiceId,
      entitlementSource: values.entitlementSource || existing.entitlementSource,
      coverageExpiresAt: values.coverageExpiresAt || existing.coverageExpiresAt,
      refundedAmountCents: Math.min(existing.amountCents, refunded),
      status: terminalPaymentStatus ? existing.status : values.status,
      paidAt: values.paidAt || existing.paidAt,
      updatedAt: new Date(),
    }).where(eq(commercePayments.id, existing.id)).returning();
    return updated || null;
  }
  const [created] = await tx.insert(commercePayments).values({
    orderId,
    stripePaymentIntentId: values.paymentIntentId || null,
    stripeChargeId: values.chargeId || null,
    stripeInvoiceId: values.invoiceId || null,
    entitlementSource: values.entitlementSource || null,
    coverageExpiresAt: values.coverageExpiresAt || null,
    amountCents: values.amountCents,
    refundedAmountCents: values.refundedAmountCents || 0,
    currency: values.currency.toUpperCase(),
    status: values.status,
    paidAt: values.paidAt || null,
  }).onConflictDoNothing().returning();
  return created || null;
}

async function applyCheckout(tx: CommerceTx, event: Stripe.Event, session: StripeObject) {
  const order = await resolveOrder(tx, session);
  orderGrants(order);
  assertCheckoutSnapshotContract(session, order);
  if ((typeof session.amount_total === "number" && session.amount_total !== order.amountTtcCents)
    || (session.currency && String(session.currency).toUpperCase() !== order.currency)) {
    throw new Error(`Checkout ${session.id} price contract conflicts with order snapshot ${order.id}`);
  }
  const subscription = typeof session.subscription === "object" ? session.subscription as StripeObject : null;
  const paymentSettled = ["paid", "no_payment_required"].includes(String(session.payment_status));
  const subscriptionActive = order.access !== "subscription"
    || (subscription && ["active", "trialing"].includes(String(subscription.status)));
  const paid = paymentSettled && subscriptionActive;
  const purchasedAt = paid ? order.purchasedAt || stripeDate(event.created) || new Date() : null;
  await tx.update(commerceOrders).set({
    stripeCheckoutSessionId: session.id,
    stripeCustomerId: stripeId(session.customer),
    stripeSubscriptionId: stripeId(session.subscription),
    status: paid ? (order.access === "subscription" ? "active" : "paid") : "checkout_open",
    purchasedAt,
    withdrawalDeadline: paid && order.access === "subscription" && purchasedAt
      ? new Date(purchasedAt.getTime() + 14 * 24 * 60 * 60_000)
      : order.withdrawalDeadline,
    updatedAt: new Date(),
  }).where(and(eq(commerceOrders.id, order.id), notInArray(commerceOrders.status, ["refunded", "partially_refunded", "disputed", "canceled", "expired"])));
  if (paid && order.access === "permanent" && !["refunded", "disputed", "canceled", "expired"].includes(order.status)) await grantOrder(tx, order, null);
  if (subscription) await upsertSubscription(tx, order, subscription);
  if (paid && order.access !== "subscription") {
    await upsertPayment(tx, order.id, {
      paymentIntentId: stripeId(session.payment_intent),
      amountCents: Number(session.amount_total || order.amountTtcCents),
      currency: String(session.currency || order.currency),
      status: "succeeded",
      paidAt: purchasedAt,
      entitlementSource: order.entitlementSource,
    });
  }
  await addHistory(tx, order.id, event.id, "checkout", paid ? "paid" : "open", order.amountTtcCents, { productId: order.productId });
}

async function applyInvoice(tx: CommerceTx, event: Stripe.Event, invoice: StripeObject) {
  const order = await resolveOrder(tx, invoice);
  const subscription = invoice._subscription as StripeObject | undefined;
  const succeeded = invoice.status === "paid";
  const coverageEnd = order.access === "subscription" ? invoiceCoverage(invoice, order) : null;
  if (order.access !== "subscription") assertCheckoutSnapshotContract({ id: invoice.id, line_items: {
    data: (invoice.lines?.data || []).map((line: StripeObject) => ({ ...line, price: line._price || line.price || line.pricing?.price_details?.price })),
  } }, order);
  if (subscription) await upsertSubscription(tx, order, subscription);
  const amount = Number((succeeded ? invoice.amount_paid : invoice.amount_due) ?? 0);
  if (!Number.isSafeInteger(amount) || amount < 0 || String(invoice.currency || "").toUpperCase() !== order.currency) throw new Error("Invoice amount or currency conflicts with order");
  await upsertPayment(tx, order.id, {
    paymentIntentId: invoicePaymentIntent(invoice),
    chargeId: invoiceCharge(invoice),
    invoiceId: invoice.id,
    amountCents: amount,
    currency: String(invoice.currency || order.currency),
    status: succeeded ? "succeeded" : "failed",
    paidAt: succeeded ? stripeDate(invoice.status_transitions?.paid_at) || new Date() : null,
  });
  if (succeeded) {
    if (order.access === "permanent" && !["refunded", "disputed", "canceled", "expired"].includes(order.status)) await grantOrder(tx, order, null);
    const paymentSource = order.access === "subscription"
      ? invoiceEntitlementSource(order.id, invoice.id)
      : order.entitlementSource;
    if (order.access === "subscription" && !["refunded", "canceled", "expired"].includes(order.status) && shouldGrantInvoiceCoverage(String(invoice.status), coverageEnd, subscription ? String(subscription.status) : null)) {
      await grantOrder(tx, order, coverageEnd, paymentSource);
    }
    await upsertPayment(tx, order.id, {
      paymentIntentId: invoicePaymentIntent(invoice),
      chargeId: invoiceCharge(invoice),
      invoiceId: invoice.id,
      amountCents: amount,
      currency: String(invoice.currency || order.currency),
      status: "succeeded",
      paidAt: stripeDate(invoice.status_transitions?.paid_at) || new Date(),
      entitlementSource: paymentSource,
      coverageExpiresAt: coverageEnd,
    });
    const paidAt = stripeDate(invoice.status_transitions?.paid_at) || new Date();
    const firstPurchaseAt = order.purchasedAt || paidAt;
    await tx.update(commerceOrders).set({
      status: order.access === "subscription" ? "active" : "paid",
      purchasedAt: firstPurchaseAt,
      withdrawalDeadline: order.access === "subscription" && !order.purchasedAt
        ? new Date(firstPurchaseAt.getTime() + 14 * 24 * 60 * 60_000)
        : order.withdrawalDeadline,
      updatedAt: new Date(),
    })
      .where(and(eq(commerceOrders.id, order.id), notInArray(commerceOrders.status, ["refunded", "partially_refunded", "disputed", "canceled", "expired"])));
  } else {
    const currentStatus = String(subscription?.status || "");
    if (["past_due", "unpaid", "incomplete"].includes(currentStatus)) {
      await tx.update(commerceOrders).set({ status: "past_due", updatedAt: new Date() }).where(and(
        eq(commerceOrders.id, order.id),
        notInArray(commerceOrders.status, ["refunded", "partially_refunded", "disputed", "canceled", "expired"]),
      ));
    }
  }
  await addHistory(tx, order.id, event.id, "invoice", succeeded ? "paid" : "payment_failed", amount, { invoiceId: invoice.id });
}

async function applyRefund(tx: CommerceTx, event: Stripe.Event, refund: StripeObject) {
  const order = await resolveOrder(tx, refund);
  const charge = refund._charge as StripeObject | undefined;
  const status = String(refund.status || "unknown");
  const amountRefunded = Number(charge?.amount_refunded || (status === "succeeded" ? refund.amount : 0) || 0);
  const amount = Number(charge?.amount || order.amountTtcCents);
  const payment = await upsertPayment(tx, order.id, {
    paymentIntentId: stripeId(refund.payment_intent) || stripeId(charge?.payment_intent),
    chargeId: stripeId(refund.charge),
    amountCents: Math.max(1, amount),
    refundedAmountCents: Math.min(amount, amountRefunded),
    currency: String(refund.currency || charge?.currency || order.currency),
    status: amountRefunded >= amount ? "refunded" : amountRefunded > 0 ? "partially_refunded"
      : status === "pending" ? "refund_pending" : "succeeded",
    entitlementSource: order.access === "subscription" && stripeId(charge?.invoice)
      ? invoiceEntitlementSource(order.id, stripeId(charge?.invoice)!)
      : order.entitlementSource,
  });
  const fullSucceeded = status === "succeeded" && amountRefunded >= Number(payment?.amountCents || amount);
  const nextOrderStatus = orderStatusAfterRefund(
    order.access,
    order.status,
    status,
    fullSucceeded,
    order.withdrawalStatus === "requested",
  );
  if (fullSucceeded) {
    await revokeEntitlementSource(tx, order, payment?.entitlementSource || order.entitlementSource);
    await revokeEntitlementSource(tx, order, payment?.restorationSource || null);
    await tx.update(commerceOrders).set({
      status: nextOrderStatus,
      refundedAt: new Date(),
      withdrawalStatus: order.withdrawalStatus === "requested" ? "completed" : order.withdrawalStatus,
      updatedAt: new Date(),
    }).where(eq(commerceOrders.id, order.id));
  } else if (nextOrderStatus !== order.status) {
    await tx.update(commerceOrders).set({ status: nextOrderStatus, updatedAt: new Date() }).where(eq(commerceOrders.id, order.id));
  }
  await addHistory(tx, order.id, event.id, "refund", status, Number(refund.amount || 0), { refundId: refund.id, full: fullSucceeded });
}

function disputeRecoverySource(orderId: string, disputeId: string) {
  const suffix = createHash("sha256").update(disputeId).digest("hex").slice(0, 20);
  return `stripe:restore:${orderId}:${suffix}`;
}

async function applyDispute(tx: CommerceTx, event: Stripe.Event, dispute: StripeObject) {
  const order = await resolveOrder(tx, dispute);
  const status = String(dispute.status || "unknown");
  const authoritativeSubscription = order.access === "subscription"
    ? dispute._invoice?._subscription as StripeObject | undefined
    : undefined;
  const authoritativeOrderStatus = authoritativeSubscription
    ? authoritativeSubscriptionOrderStatus(
        String(authoritativeSubscription.status || "unknown"),
        authoritativeSubscription.cancel_at_period_end === true,
      )
    : null;
  if (authoritativeSubscription) await upsertSubscription(tx, order, authoritativeSubscription);
  const paymentIntentId = stripeId(dispute._charge?.payment_intent);
  const chargeId = stripeId(dispute.charge) || stripeId(dispute._charge);
  const paymentConditions = [];
  if (paymentIntentId) paymentConditions.push(eq(commercePayments.stripePaymentIntentId, paymentIntentId));
  if (chargeId) paymentConditions.push(eq(commercePayments.stripeChargeId, chargeId));
  let [payment] = paymentConditions.length
    ? await tx.select().from(commercePayments).where(or(...paymentConditions)).limit(1)
    : [];
  if (!payment && dispute._charge) {
    const invoiceId = stripeId(dispute._charge.invoice);
    const source = order.access === "subscription" && invoiceId ? invoiceEntitlementSource(order.id, invoiceId) : order.entitlementSource;
    const coverageExpiresAt = order.access === "subscription" && dispute._invoice
      ? invoiceCoverage(dispute._invoice, order)
      : null;
    payment = (await upsertPayment(tx, order.id, {
      paymentIntentId,
      chargeId,
      invoiceId,
      amountCents: Math.max(1, Number(dispute._charge.amount || dispute.amount || order.amountTtcCents)),
      currency: String(dispute._charge.currency || dispute.currency || order.currency),
      status: "disputed",
      paidAt: stripeDate(dispute._charge.created),
      entitlementSource: source,
      coverageExpiresAt,
    })) || undefined;
  }
  if (payment && payment.orderId !== order.id) throw new Error("Disputed payment belongs to another order");
  const chargeFullyRefunded = Number(dispute._charge?.amount) > 0
    && Number(dispute._charge?.amount_refunded) >= Number(dispute._charge?.amount);
  if (chargeFullyRefunded || payment?.status === "refunded") {
    await revokeEntitlementSource(tx, order, payment?.entitlementSource || order.entitlementSource);
    await revokeEntitlementSource(tx, order, payment?.restorationSource || null);
    if (payment) await tx.update(commercePayments).set({ status: "refunded", refundedAmountCents: payment.amountCents, updatedAt: new Date() }).where(eq(commercePayments.id, payment.id));
    if (order.access !== "subscription") await tx.update(commerceOrders).set({ status: "refunded", updatedAt: new Date() }).where(eq(commerceOrders.id, order.id));
    await addHistory(tx, order.id, event.id, "dispute", "payment_already_refunded", Number(dispute.amount || 0));
    return;
  }
  if (["warning_needs_response", "warning_under_review", "needs_response", "under_review"].includes(status)) {
    await revokeEntitlementSource(tx, order, payment?.entitlementSource || order.entitlementSource);
    await revokeEntitlementSource(tx, order, payment?.restorationSource || null);
    const disputedOrderStatus = order.access === "subscription"
      ? preserveTerminalSubscriptionOrderStatus(authoritativeOrderStatus || order.status, "disputed")
      : "disputed";
    await tx.update(commerceOrders).set({ status: disputedOrderStatus, disputedAt: new Date(), updatedAt: new Date() })
      .where(eq(commerceOrders.id, order.id));
    if (payment) await tx.update(commercePayments).set({ status: "disputed", updatedAt: new Date() }).where(eq(commercePayments.id, payment.id));
  } else if (status === "won") {
    if (order.access === "subscription" && !canRestoreSubscriptionDispute(authoritativeOrderStatus)) {
      await addHistory(tx, order.id, event.id, "dispute", "won_but_subscription_terminal", Number(dispute.amount || 0), { disputeId: dispute.id });
      return;
    }
    if (!canRestoreWonDispute(authoritativeOrderStatus || order.status, payment?.status || null)) {
      await addHistory(tx, order.id, event.id, "dispute", "won_but_payment_terminal", Number(dispute.amount || 0), { disputeId: dispute.id });
      return;
    }
    let expiresAt: Date | null = null;
    if (order.access === "subscription") {
      expiresAt = payment?.coverageExpiresAt || null;
      if (!expiresAt || expiresAt <= new Date()) {
        await addHistory(tx, order.id, event.id, "dispute", "won_access_expired", Number(dispute.amount || 0), { disputeId: dispute.id });
        return;
      }
    }
    const restorationSource = disputeRecoverySource(order.id, dispute.id);
    await grantOrder(tx, order, expiresAt, restorationSource);
    await tx.update(commerceOrders).set({ status: order.access === "subscription" ? authoritativeOrderStatus! : "paid", updatedAt: new Date() })
      .where(eq(commerceOrders.id, order.id));
    if (payment) await tx.update(commercePayments).set({ status: "succeeded", restorationSource, updatedAt: new Date() }).where(eq(commercePayments.id, payment.id));
  } else if (status === "lost") {
    await revokeEntitlementSource(tx, order, payment?.entitlementSource || order.entitlementSource);
    await revokeEntitlementSource(tx, order, payment?.restorationSource || null);
    const lostOrderStatus = order.access === "subscription"
      ? preserveTerminalSubscriptionOrderStatus(authoritativeOrderStatus || order.status, "disputed")
      : "refunded";
    await tx.update(commerceOrders).set({ status: lostOrderStatus, updatedAt: new Date() }).where(eq(commerceOrders.id, order.id));
    if (payment) await tx.update(commercePayments).set({ status: "dispute_lost", updatedAt: new Date() }).where(eq(commercePayments.id, payment.id));
  }
  await addHistory(tx, order.id, event.id, "dispute", status, Number(dispute.amount || 0), { disputeId: dispute.id });
}

async function applyStripeEvent(tx: CommerceTx, event: Stripe.Event, object: StripeObject) {
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    return applyCheckout(tx, event, object);
  }
  if (["checkout.session.expired", "checkout.session.async_payment_failed"].includes(event.type)) {
    const order = await resolveOrder(tx, object);
    await tx.update(commerceOrders).set({ status: event.type.endsWith("expired") ? "expired" : "failed", updatedAt: new Date() })
      .where(and(eq(commerceOrders.id, order.id), inArray(commerceOrders.status, ["created", "checkout_open", "failed", "expired"])));
    return addHistory(tx, order.id, event.id, "checkout", event.type.endsWith("expired") ? "expired" : "failed");
  }
  if (["invoice.paid", "invoice.payment_failed"].includes(event.type)) return applyInvoice(tx, event, object);
  if (event.type.startsWith("customer.subscription.")) {
    const order = await resolveOrder(tx, object);
    await upsertSubscription(tx, order, object);
    return addHistory(tx, order.id, event.id, "subscription", String(object.status || "unknown"), null, {
      cancelAtPeriodEnd: object.cancel_at_period_end === true,
    });
  }
  if (["refund.created", "refund.updated", "refund.failed"].includes(event.type)) return applyRefund(tx, event, object);
  if (["charge.dispute.created", "charge.dispute.closed"].includes(event.type)) return applyDispute(tx, event, object);
  // Bootstrap only subscribes to supported events. Unknown events are safely recorded as processed.
}

export async function claimCommerceWebhookEvents(limit = 10) {
  return db.execute<ClaimedEvent>(sql`
    WITH candidates AS (
      SELECT stripe_event_id
        FROM commerce_webhook_events
       WHERE (
         (status IN ('received', 'failed') AND next_attempt_at <= now())
         OR (status = 'processing' AND locked_at < now() - interval '5 minutes')
       )
       ORDER BY received_at
       FOR UPDATE SKIP LOCKED
       LIMIT ${Math.max(1, Math.min(limit, 50))}
    )
    UPDATE commerce_webhook_events event
       SET status = 'processing', attempts = event.attempts + 1, locked_at = now(), lock_token = gen_random_uuid(), updated_at = now(), last_error = NULL
      FROM candidates
     WHERE event.stripe_event_id = candidates.stripe_event_id
    RETURNING event.stripe_event_id, event.event_type, event.livemode, event.attempts, event.lock_token
  `);
}

export async function processCommerceWebhookEvent(claimed: ClaimedEvent, client = stripeClient()) {
  try {
    const event = await client.events.retrieve(claimed.stripe_event_id);
    if (event.type !== claimed.event_type || event.livemode !== claimed.livemode) {
      throw new Error("Retrieved Stripe event does not match the stored envelope");
    }
    const mode = process.env.COMMERCE_STRIPE_MODE as CommerceMode;
    assertStripeLivemode(event.livemode, mode);
    const object = await currentStripeObject(client, event);
    object._eventLivemode = event.livemode;
    const processed = await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(commerceWebhookEvents)
        .where(and(
          eq(commerceWebhookEvents.stripeEventId, event.id),
          eq(commerceWebhookEvents.lockToken, claimed.lock_token),
          eq(commerceWebhookEvents.status, "processing"),
        )).limit(1).for("update");
      if (!locked || locked.status === "processed") return false;
      try {
        await applyStripeEvent(tx, event, object);
      } catch (error) {
        if (!(error instanceof UnrelatedStripeObjectError)) throw error;
      }
      await tx.update(commerceWebhookEvents).set({
        status: "processed",
        processedAt: new Date(),
        lockedAt: null,
        lockToken: null,
        lastError: null,
        updatedAt: new Date(),
      }).where(and(
        eq(commerceWebhookEvents.stripeEventId, event.id),
        eq(commerceWebhookEvents.lockToken, claimed.lock_token),
        eq(commerceWebhookEvents.status, "processing"),
      ));
      return true;
    });
    return processed;
  } catch (error) {
    const attempts = Number(claimed.attempts || 1);
    const delaySeconds = Math.min(86_400, 2 ** Math.min(attempts, 12) * 15);
    const message = (error instanceof Error ? error.message : "Webhook processing failed").slice(0, 500);
    await db.update(commerceWebhookEvents).set({
      status: "failed",
      nextAttemptAt: new Date(Date.now() + delaySeconds * 1_000),
      lockedAt: null,
      lockToken: null,
      lastError: message,
      updatedAt: new Date(),
    }).where(and(
      eq(commerceWebhookEvents.stripeEventId, claimed.stripe_event_id),
      eq(commerceWebhookEvents.lockToken, claimed.lock_token),
      eq(commerceWebhookEvents.status, "processing"),
    ));
    return false;
  }
}

export async function processCommerceWebhookBatch(limit = 10) {
  const results: boolean[] = [];
  for (let index = 0; index < Math.max(1, Math.min(limit, 50)); index += 1) {
    // Claim immediately before processing, so later batch entries cannot expire in a local queue.
    const [event] = await claimCommerceWebhookEvents(1);
    if (!event) break;
    results.push(await processCommerceWebhookEvent(event));
  }
  return { claimed: results.length, processed: results.filter(Boolean).length, failed: results.filter((result) => !result).length };
}

export async function retryCommerceWebhookEvent(eventId: string) {
  const [event] = await db.update(commerceWebhookEvents).set({
    status: "received",
    nextAttemptAt: new Date(),
    lockedAt: null,
    lockToken: null,
    lastError: null,
    updatedAt: new Date(),
  }).where(and(
    eq(commerceWebhookEvents.stripeEventId, eventId),
    inArray(commerceWebhookEvents.status, ["failed", "processing"]),
  )).returning();
  return event || null;
}

export async function reconcileCommerceWebhookEvents() {
  const rows = await db.update(commerceWebhookEvents).set({
    status: "received",
    nextAttemptAt: new Date(),
    lockedAt: null,
    lockToken: null,
    updatedAt: new Date(),
  }).where(or(
    eq(commerceWebhookEvents.status, "failed"),
    and(eq(commerceWebhookEvents.status, "processing"), sql`${commerceWebhookEvents.lockedAt} < now() - interval '5 minutes'`),
  )).returning({ id: commerceWebhookEvents.stripeEventId });
  return rows.length;
}

export const commerceWebhookInternals = { applyStripeEvent, applyCheckout, applyInvoice, applyRefund, applyDispute, currentStripeObject, assertCheckoutSnapshotContract };

// Recover a Checkout response lost in transit without creating a second charge.
// Only canonical Stripe Events are queued; this reconciliation never grants access.
export async function reconcilePendingCommerceCheckouts(client = stripeClient(), now = new Date()) {
  const orders = await db.select().from(commerceOrders).where(and(
    inArray(commerceOrders.status, ["created", "checkout_open"]),
    sql`${commerceOrders.updatedAt} < ${new Date(now.getTime() - 120_000).toISOString()}::timestamptz`,
  )).orderBy(commerceOrders.updatedAt).limit(10);
  let recovered = 0;
  for (const order of orders) {
    if (order.stripeMode !== process.env.COMMERCE_STRIPE_MODE) continue;
    try {
      let session: Stripe.Checkout.Session | undefined;
      if (order.stripeCheckoutSessionId) session = await client.checkout.sessions.retrieve(order.stripeCheckoutSessionId);
      else if (order.stripeCustomerId) {
        const candidates = await client.checkout.sessions.list({ customer: order.stripeCustomerId, created: { gte: Math.floor(order.createdAt.getTime()/1000) - 5 }, limit: 100 });
        const matches = candidates.data.filter((item) => item.metadata?.cookiebuild_order_id === order.id);
        if (candidates.has_more || matches.length > 1) throw new Error("Ambiguous pending Checkout recovery");
        session = matches[0];
      }
      if (!session) {
        // Sessions explicitly expire after 31 minutes; retain the guard beyond that deadline.
        if (now.getTime() - order.createdAt.getTime() > 35 * 60_000) {
          await db.update(commerceOrders).set({ status: "failed", updatedAt: now }).where(and(eq(commerceOrders.id, order.id), eq(commerceOrders.status, "created")));
        }
        continue;
      }
      assertStripeLivemode(session.livemode, order.stripeMode as CommerceMode);
      if (stripeId(session.customer) !== order.stripeCustomerId || session.metadata?.cookiebuild_order_id !== order.id) {
        throw new Error("Pending Checkout recovery ownership mismatch");
      }
      await db.update(commerceOrders).set({ stripeCheckoutSessionId: session.id,
        status: session.status === "expired" ? "expired" : "checkout_open", updatedAt: now,
      }).where(and(eq(commerceOrders.id, order.id), inArray(commerceOrders.status, ["created", "checkout_open"])));
      if (session.status === "complete") {
        const events = await client.events.list({ types: ["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed"],
          created: { gte: Math.floor(order.createdAt.getTime()/1000) - 5 }, limit: 100 }).autoPagingToArray({ limit: 500 });
        for (const event of events) {
          if (stripeId(event.data.object) !== session.id || event.livemode !== session.livemode) continue;
          await db.insert(commerceWebhookEvents).values({ stripeEventId: event.id, eventType: event.type, objectId: session.id, livemode: event.livemode }).onConflictDoNothing();
        }
      }
      recovered++;
    } catch {
      // No Stripe payloads or buyer data are logged; the pending order remains retryable.
      console.error("Commerce Checkout reconciliation failed", { orderId: order.id });
    }
  }
  return { checked: orders.length, recovered };
}
