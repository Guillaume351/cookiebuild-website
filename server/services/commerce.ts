import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { createError } from "h3";
import type Stripe from "stripe";
import db from "../../db/client";
import {
  commerceCustomers,
  commerceGuestPayers,
  commerceOrderHistory,
  commerceOrders,
  commercePayments,
  commerceSubscriptions,
  cosmeticEntitlements,
  cosmeticSelections,
  playerdata,
} from "../../db/schema";
import { COSMETIC_CATALOG, COSMETIC_PRODUCTS, cosmeticById, isCosmeticSlot, isFreeCosmetic } from "../../shared/cosmetics-catalog";
import { payerOrderFilter, payerOwnsOrder, type CommercePayer } from "./commerce-payer";
import { requireCommerceRecipient } from "./commerce-recipients";
import {
  requireCommerceReadiness,
  resolveStripePrice,
  stripeClient,
  type CosmeticProduct,
} from "../utils/stripe-commerce";

export const CONSUMER_NOTICE_VERSION = "commerce-fr-v1-2026-09-05";
export const TERMS_NOTICE = "J’accepte les CGV et confirme que cette commande m’oblige à payer le prix TTC affiché.";
export const IMMEDIATE_PERFORMANCE_NOTICE = "Je demande expressément l’exécution immédiate et la livraison de l’accès numérique avant la fin du délai de rétractation.";
export const WITHDRAWAL_WAIVER_NOTICE = "Je reconnais perdre mon droit de rétractation dès que l’accès numérique acheté est livré.";
const SUBSCRIPTION_NOTICE = "L’abonnement mensuel peut être résilié depuis le portail. Le délai de rétractation initial de 14 jours reste disponible dans l’historique.";

export interface CheckoutInput {
  productId?: unknown;
  recipientId?: unknown;
  termsAccepted?: unknown;
  immediatePerformanceConsent?: unknown;
  withdrawalWaiverAcknowledged?: unknown;
}

function catalogProduct(productId: unknown): CosmeticProduct {
  const id = String(productId ?? "").trim();
  const product = COSMETIC_PRODUCTS.find((entry) => entry.id === id);
  if (!product) throw createError({ statusCode: 400, statusMessage: "Unknown catalog product" });
  return product;
}

export function validateCheckoutInput(input: CheckoutInput) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw createError({ statusCode: 400, statusMessage: "Invalid checkout request" });
  const product = catalogProduct(input.productId);
  if (input.termsAccepted !== true) {
    throw createError({ statusCode: 400, statusMessage: "Terms acceptance is required" });
  }
  if (product.access === "permanent") {
    if (input.immediatePerformanceConsent !== true || input.withdrawalWaiverAcknowledged !== true) {
      throw createError({
        statusCode: 400,
        statusMessage: "Both immediate delivery and withdrawal waiver acknowledgements are required",
      });
    }
  }
  return product;
}

function orderNotice(product: CosmeticProduct) {
  const parts = [TERMS_NOTICE];
  if (product.access === "permanent") parts.push(IMMEDIATE_PERFORMANCE_NOTICE, WITHDRAWAL_WAIVER_NOTICE);
  if (product.access === "subscription") parts.push(SUBSCRIPTION_NOTICE);
  if (product.access === "none") parts.push("Ce soutien libre n’accorde aucun rang, cosmétique ni avantage exclusif.");
  return parts.join("\n\n");
}

async function ensureStripeCustomer(client: Stripe, auth: CommercePayer, stripeMode: "test" | "live") {
  if ("guestId" in auth) {
    const [guest] = await db.select().from(commerceGuestPayers).where(eq(commerceGuestPayers.id, auth.guestId)).limit(1);
    if (!guest) throw createError({ statusCode: 401, statusMessage: "Purchase session required" });
    const field = stripeMode === "live" ? "stripeLiveCustomerId" : "stripeTestCustomerId";
    if (guest[field]) return guest[field]!;
    const customer = await client.customers.create({ metadata: { cookiebuild_payer_id: guest.id } },
      { idempotencyKey: `commerce-guest:${stripeMode}:${guest.id}` });
    await db.update(commerceGuestPayers).set({ [field]: customer.id }).where(eq(commerceGuestPayers.id, guest.id));
    return customer.id;
  }
  const [existing] = await db
    .select({ stripeCustomerId: commerceCustomers.stripeCustomerId })
    .from(commerceCustomers)
    .where(and(eq(commerceCustomers.playerId, auth.playerId), eq(commerceCustomers.stripeMode, stripeMode)))
    .limit(1);
  if (existing) return existing.stripeCustomerId;

  const customer = await client.customers.create({
    name: auth.playerName || undefined,
    metadata: { cookiebuild_player_id: auth.playerId },
  }, { idempotencyKey: `commerce-customer:${auth.playerId}` });
  await db.insert(commerceCustomers).values({ playerId: auth.playerId, stripeMode, stripeCustomerId: customer.id })
    .onConflictDoUpdate({
      target: [commerceCustomers.playerId, commerceCustomers.stripeMode],
      set: { stripeCustomerId: customer.id, updatedAt: new Date() },
    });
  return customer.id;
}

export async function createCommerceCheckout(auth: CommercePayer, input: CheckoutInput, now = new Date()) {
  const product = validateCheckoutInput(input);
  const recipient = await requireCommerceRecipient(input.recipientId ?? ("playerId" in auth ? auth.playerId : null));
  const readiness = requireCommerceReadiness();
  const client = stripeClient();
  const price = await resolveStripePrice(client, product, readiness.mode);
  if (product.access !== "none") {
    const guardedStatuses = product.access === "subscription"
      ? ["created", "checkout_open", "active", "past_due", "canceling", "disputed"]
      : ["created", "checkout_open", "paid", "active", "disputed", "partially_refunded"];
    const [existingOrder] = await db.select().from(commerceOrders).where(and(
      eq(commerceOrders.playerId, recipient.id),
      eq(commerceOrders.productId, product.id),
      inArray(commerceOrders.status, guardedStatuses),
    )).limit(1);
    if (existingOrder && payerOwnsOrder(auth, existingOrder) && existingOrder.status === "checkout_open" && existingOrder.stripeCheckoutSessionId && existingOrder.stripeMode === readiness.mode) {
      const pending = await client.checkout.sessions.retrieve(existingOrder.stripeCheckoutSessionId);
      if (pending.status === "open" && pending.url) return { orderId: existingOrder.id, url: pending.url };
    }
    if (existingOrder) {
      throw createError({
        statusCode: 409,
        statusMessage: product.access === "subscription"
          ? "An active or pending subscription already exists"
          : "This permanent product is already owned or pending",
      });
    }
  }
  const orderId = randomUUID();
  const entitlementSource = `stripe:order:${orderId}`;
  const withdrawalDeadline = product.access === "subscription"
    ? new Date(now.getTime() + 14 * 24 * 60 * 60_000)
    : null;
  const withdrawalStatus = product.access === "subscription"
    ? "eligible"
    : product.access === "permanent" ? "waived" : "not_applicable";

  try {
    await db.insert(commerceOrders).values({
      id: orderId,
      playerId: recipient.id,
      payerPlayerId: "playerId" in auth ? auth.playerId : null,
      payerGuestId: "guestId" in auth ? auth.guestId : null,
      productId: product.id,
      productVersion: product.productVersion,
      productName: product.name,
      access: product.access,
      grantsSnapshot: [...product.grants],
      amountTtcCents: product.priceTtcCents,
      currency: "EUR",
      status: "created",
      stripeMode: readiness.mode,
      entitlementSource,
      consumerNoticeVersion: CONSUMER_NOTICE_VERSION,
      consumerNoticeText: orderNotice(product),
      termsAcceptedAt: now,
      immediatePerformanceConsentedAt: product.access === "permanent" ? now : null,
      withdrawalWaiverAcknowledgedAt: product.access === "permanent" ? now : null,
      withdrawalDeadline,
      withdrawalStatus,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw createError({ statusCode: 409, statusMessage: "This product already has an active or pending order" });
    }
    throw error;
  }

  try {
    const customerId = await ensureStripeCustomer(client, auth, readiness.mode);
    await db.update(commerceOrders).set({ stripeCustomerId: customerId }).where(eq(commerceOrders.id, orderId));
    const metadata = {
      cookiebuild_order_id: orderId,
      cookiebuild_player_id: recipient.id,
      cookiebuild_product_id: product.id,
      cookiebuild_product_version: String(product.productVersion),
      cookiebuild_entitlement_source: entitlementSource,
    };
    const isSubscription = product.access === "subscription";
    const checkout = await client.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      client_reference_id: orderId,
      // Stripe requires at least 30 minutes at receipt, so allow transport latency.
      expires_at: Math.floor(Date.now() / 1_000) + 1_860,
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${readiness.publicBaseUrl}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${readiness.publicBaseUrl}/shop/cancel?order=${orderId}`,
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      automatic_tax: { enabled: readiness.automaticTax },
      allow_promotion_codes: false,
      metadata,
      ...(isSubscription
        ? { subscription_data: { metadata } }
        : {
            payment_intent_data: { metadata },
            invoice_creation: { enabled: true, invoice_data: { metadata } },
            submit_type: "pay" as const,
          }),
      custom_text: {
        submit: {
          message: isSubscription
            ? `S’abonner et payer ${(product.priceTtcCents / 100).toFixed(2)} € TTC par mois. Résiliation via le portail.`
            : `Acheter et payer ${(product.priceTtcCents / 100).toFixed(2)} € TTC.`,
        },
      },
    }, { idempotencyKey: `checkout:${orderId}` });

    if (!checkout.url) throw new Error("Stripe did not return a hosted Checkout URL");
    await db.update(commerceOrders).set({
      status: sql`CASE WHEN ${commerceOrders.status} = 'created' THEN 'checkout_open' ELSE ${commerceOrders.status} END`,
      stripeCustomerId: customerId,
      stripeCheckoutSessionId: checkout.id,
      updatedAt: new Date(),
    }).where(eq(commerceOrders.id, orderId));
    return { orderId, url: checkout.url };
  } catch (error) {
    // A transport error may happen after Stripe created the session. Keep the order
    // pending until the worker reconciles it; releasing the unique guard could double-charge.
    if (error && typeof error === "object" && "type" in error && error.type === "StripeInvalidRequestError") {
      await db.update(commerceOrders).set({ status: "failed", updatedAt: new Date() }).where(and(eq(commerceOrders.id, orderId), eq(commerceOrders.status, "created")));
    }
    throw error;
  }
}

export async function createCommercePortal(auth: CommercePayer) {
  const readiness = requireCommerceReadiness();
  let customerId: string | null = null;
  if ("guestId" in auth) {
    const [guest] = await db.select().from(commerceGuestPayers).where(eq(commerceGuestPayers.id, auth.guestId)).limit(1);
    customerId = (readiness.mode === "live" ? guest?.stripeLiveCustomerId : guest?.stripeTestCustomerId) || null;
  } else {
    const [customer] = await db.select().from(commerceCustomers).where(and(eq(commerceCustomers.playerId, auth.playerId), eq(commerceCustomers.stripeMode, readiness.mode))).limit(1);
    customerId = customer?.stripeCustomerId || null;
  }
  if (!customerId) throw createError({ statusCode: 404, statusMessage: "No billing customer exists for this payer" });
  const client = stripeClient();
  const configurations = await client.billingPortal.configurations.list({ active: true, limit: 100 });
  const matches = configurations.data.filter((entry) => entry.metadata?.cookiebuild === "commerce-v1");
  if (matches.length !== 1) throw createError({ statusCode: 503, statusMessage: "The Cookie Build billing portal is not uniquely configured" });
  const session = await client.billingPortal.sessions.create({
    customer: customerId,
    configuration: matches[0]!.id,
    return_url: `${readiness.publicBaseUrl}/shop/history`,
  });
  return { url: session.url };
}

export async function commerceInventory(playerId: string, now = new Date()) {
  const entitlements = await db.select({
    cosmeticId: cosmeticEntitlements.cosmeticId,
    source: cosmeticEntitlements.source,
    grantedAt: cosmeticEntitlements.grantedAt,
    expiresAt: cosmeticEntitlements.expiresAt,
  }).from(cosmeticEntitlements).where(and(
    eq(cosmeticEntitlements.playerId, playerId),
    isNull(cosmeticEntitlements.revokedAt),
    or(isNull(cosmeticEntitlements.expiresAt), gt(cosmeticEntitlements.expiresAt, now)),
  )).orderBy(cosmeticEntitlements.cosmeticId, desc(cosmeticEntitlements.expiresAt));
  const selections = await db.select({
    slot: cosmeticSelections.slot,
    cosmeticId: cosmeticSelections.cosmeticId,
    selectedAt: cosmeticSelections.selectedAt,
  }).from(cosmeticSelections).where(eq(cosmeticSelections.playerId, playerId));
  const aggregated = new Map<string, { cosmeticId: string; grantedAt: Date | null; expiresAt: Date | null }>();
  for (const entry of entitlements) {
    const current = aggregated.get(entry.cosmeticId);
    if (!current) {
      aggregated.set(entry.cosmeticId, { cosmeticId: entry.cosmeticId, grantedAt: entry.grantedAt, expiresAt: entry.expiresAt });
    } else {
      current.grantedAt = current.grantedAt && current.grantedAt < entry.grantedAt ? current.grantedAt : entry.grantedAt;
      current.expiresAt = current.expiresAt === null || entry.expiresAt === null
        ? null
        : current.expiresAt > entry.expiresAt ? current.expiresAt : entry.expiresAt;
    }
  }
  for (const item of COSMETIC_CATALOG) {
    if (isFreeCosmetic(item.id)) aggregated.set(item.id, { cosmeticId: item.id, grantedAt: null, expiresAt: null });
  }
  return {
    entitlements: [...aggregated.values()].map((entry) => ({
      ...entry,
      item: COSMETIC_CATALOG.find((item) => item.id === entry.cosmeticId) || null,
    })),
    selections,
  };
}

export async function selectCommerceCosmetic(playerId: string, input: { slot?: unknown; cosmeticId?: unknown }, now = new Date()) {
  if (!input || typeof input.slot !== "string" || !isCosmeticSlot(input.slot)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid cosmetic slot" });
  }
  const slot = input.slot;
  if (slot === "JOIN_FLAIR") throw createError({ statusCode: 400, statusMessage: "Join flair applies automatically while owned" });
  const cosmeticId = input.cosmeticId;
  if (cosmeticId !== null && (typeof cosmeticId !== "string" || cosmeticById(cosmeticId)?.slot !== slot)) {
    throw createError({ statusCode: 400, statusMessage: "Cosmetic does not belong to this slot" });
  }
  await db.transaction(async (tx) => {
    await tx.select({ id: playerdata.id }).from(playerdata).where(eq(playerdata.id, playerId)).for("update");
    if (cosmeticId === null) {
      await tx.delete(cosmeticSelections).where(and(eq(cosmeticSelections.playerId, playerId), eq(cosmeticSelections.slot, slot)));
      return;
    }
    const [grant] = await tx.select({ id: cosmeticEntitlements.cosmeticId }).from(cosmeticEntitlements).where(and(
      eq(cosmeticEntitlements.playerId, playerId), eq(cosmeticEntitlements.cosmeticId, cosmeticId),
      isNull(cosmeticEntitlements.revokedAt), or(isNull(cosmeticEntitlements.expiresAt), gt(cosmeticEntitlements.expiresAt, now)),
    )).limit(1).for("share");
    if (!grant && !isFreeCosmetic(cosmeticId)) throw createError({ statusCode: 403, statusMessage: "An active cosmetic entitlement is required" });
    await tx.insert(cosmeticSelections).values({ playerId, slot, cosmeticId, selectedAt: now }).onConflictDoUpdate({
      target: [cosmeticSelections.playerId, cosmeticSelections.slot], set: { cosmeticId, selectedAt: now },
    });
  });
  return commerceInventory(playerId, now);
}

export async function commerceHistory(auth: CommercePayer) {
  const orders = await db.select({
    id: commerceOrders.id,
    recipientId: commerceOrders.playerId,
    recipientName: playerdata.name,
    productId: commerceOrders.productId,
    productVersion: commerceOrders.productVersion,
    productName: commerceOrders.productName,
    access: commerceOrders.access,
    grants: commerceOrders.grantsSnapshot,
    amountTtcCents: commerceOrders.amountTtcCents,
    currency: commerceOrders.currency,
    status: commerceOrders.status,
    noticeVersion: commerceOrders.consumerNoticeVersion,
    noticeText: commerceOrders.consumerNoticeText,
    termsAcceptedAt: commerceOrders.termsAcceptedAt,
    immediatePerformanceConsentedAt: commerceOrders.immediatePerformanceConsentedAt,
    withdrawalWaiverAcknowledgedAt: commerceOrders.withdrawalWaiverAcknowledgedAt,
    withdrawalDeadline: commerceOrders.withdrawalDeadline,
    withdrawalStatus: commerceOrders.withdrawalStatus,
    purchasedAt: commerceOrders.purchasedAt,
    createdAt: commerceOrders.createdAt,
  }).from(commerceOrders).leftJoin(playerdata, eq(playerdata.id, commerceOrders.playerId)).where(payerOrderFilter(auth)).orderBy(desc(commerceOrders.createdAt));

  const orderIds = orders.map((order) => order.id);
  if (!orderIds.length) return { orders: [], subscriptions: [], payments: [], events: [] };
  const [subscriptions, payments, events] = await Promise.all([
    db.select({
      orderId: commerceSubscriptions.orderId,
      productId: commerceSubscriptions.productId,
      status: commerceSubscriptions.status,
      currentPeriodEnd: commerceSubscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: commerceSubscriptions.cancelAtPeriodEnd,
      endedAt: commerceSubscriptions.endedAt,
      updatedAt: commerceSubscriptions.updatedAt,
    }).from(commerceSubscriptions).where(inArray(commerceSubscriptions.orderId, orderIds)).orderBy(desc(commerceSubscriptions.updatedAt)),
    db.execute(sql`
      SELECT payment.id, payment.order_id, payment.amount_cents, payment.refunded_amount_cents,
             payment.currency, payment.status, payment.paid_at, payment.created_at
        FROM commerce_payments payment
        JOIN commerce_orders orders ON orders.id = payment.order_id
       WHERE orders.id IN (${sql.join(orderIds.map(id => sql`${id}::uuid`), sql`, `)})
       ORDER BY payment.created_at DESC
    `),
    db.execute(sql`
      SELECT history.id, history.order_id, history.kind, history.status, history.amount_cents,
             history.occurred_at
        FROM commerce_order_history history
        JOIN commerce_orders orders ON orders.id = history.order_id
       WHERE orders.id IN (${sql.join(orderIds.map(id => sql`${id}::uuid`), sql`, `)})
       ORDER BY history.occurred_at DESC
    `),
  ]);
  return { orders, subscriptions, payments: [...payments], events: [...events] };
}

export async function requestSubscriptionWithdrawal(auth: CommercePayer, orderId: string, now = new Date()) {
  const claimed = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(commerceOrders).where(and(
      eq(commerceOrders.id, orderId),
      payerOrderFilter(auth),
    )).limit(1).for("update");
    if (order && order.stripeMode !== process.env.COMMERCE_STRIPE_MODE) throw createError({ statusCode: 409, statusMessage: "This purchase belongs to a different payment environment" });
    if (!order || order.access !== "subscription" || !order.stripeSubscriptionId || order.withdrawalStatus !== "eligible"
      || !order.withdrawalDeadline || order.withdrawalDeadline <= now) {
      throw createError({ statusCode: 409, statusMessage: "This subscription is not eligible for withdrawal" });
    }
    const [payment] = await tx.select().from(commercePayments).where(and(
      eq(commercePayments.orderId, order.id),
      eq(commercePayments.status, "succeeded"),
    )).orderBy(desc(commercePayments.paidAt)).limit(1);
    if (!payment?.stripePaymentIntentId) {
      throw createError({ statusCode: 409, statusMessage: "No settled payment is available for withdrawal" });
    }
    const [updated] = await tx.update(commerceOrders).set({
      withdrawalStatus: "requested",
      withdrawalRequestedAt: now,
      withdrawalPaymentId: payment.id,
      updatedAt: now,
    }).where(and(eq(commerceOrders.id, order.id), eq(commerceOrders.withdrawalStatus, "eligible"))).returning();
    if (!updated) throw createError({ statusCode: 409, statusMessage: "Withdrawal is already being processed" });
    await tx.insert(commerceOrderHistory).values({
      orderId: order.id,
      dedupeKey: `withdrawal-requested:${order.id}`,
      kind: "withdrawal_requested",
      status: "pending_webhook",
      amountCents: payment.amountCents,
      details: { noticeVersion: order.consumerNoticeVersion },
      occurredAt: now,
    }).onConflictDoNothing();
    return { order, payment };
  });
  await executeSubscriptionWithdrawal(claimed.order, claimed.payment);
  return { orderId: claimed.order.id, status: "requested" as const };
}

async function executeSubscriptionWithdrawal(
  order: typeof commerceOrders.$inferSelect,
  payment: typeof commercePayments.$inferSelect,
) {
  if (order.stripeMode !== process.env.COMMERCE_STRIPE_MODE) throw new Error("Withdrawal payment environment mismatch");
  if (!order.stripeSubscriptionId || !payment.stripePaymentIntentId) return false;
  const client = stripeClient();
  await client.subscriptions.cancel(order.stripeSubscriptionId, {}, { idempotencyKey: `withdrawal-cancel:${order.id}` });
  await client.refunds.create({ payment_intent: payment.stripePaymentIntentId, reason: "requested_by_customer", metadata: {
    cookiebuild_order_id: order.id,
    cookiebuild_withdrawal: "true",
  } }, { idempotencyKey: `withdrawal-refund:${order.id}` });
  return true;
}

export async function processPendingSubscriptionWithdrawals(limit = 5) {
  const mode = process.env.COMMERCE_STRIPE_MODE;
  if (mode !== "test" && mode !== "live") return { pending: 0, submitted: 0 };
  await db.update(commerceOrders).set({ withdrawalStatus: "expired", updatedAt: new Date() }).where(and(
    eq(commerceOrders.withdrawalStatus, "eligible"),
    eq(commerceOrders.stripeMode, mode),
    sql`${commerceOrders.withdrawalDeadline} <= now()`,
  ));
  const pending = await db.select({ order: commerceOrders, payment: commercePayments })
    .from(commerceOrders)
    .innerJoin(commercePayments, and(
      eq(commercePayments.id, commerceOrders.withdrawalPaymentId),
      eq(commercePayments.orderId, commerceOrders.id),
    ))
    .where(and(eq(commerceOrders.withdrawalStatus, "requested"), eq(commerceOrders.stripeMode, mode)))
    .orderBy(commerceOrders.withdrawalRequestedAt)
    .limit(Math.max(1, Math.min(limit, 20)));
  let completed = 0;
  for (const row of pending) {
    try {
      if (await executeSubscriptionWithdrawal(row.order, row.payment)) completed += 1;
    } catch (error) {
      console.error("Stripe subscription withdrawal retry failed", {
        orderId: row.order.id,
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }
  return { pending: pending.length, submitted: completed };
}
