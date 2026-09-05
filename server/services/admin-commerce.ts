import { and, desc, eq, inArray } from "drizzle-orm";
import { createError } from "h3";
import db from "../../db/client";
import {
  commerceOrders,
  commercePayments,
  commerceSubscriptions,
  commerceWebhookEvents,
} from "../../db/schema";
import { stripeClient } from "../utils/stripe-commerce";
import { adminRefundPendingIsRecent } from "../utils/commerce-transitions";
import { reconcileCommerceWebhookEvents, retryCommerceWebhookEvent } from "./commerce-webhook";

export async function adminCommerceOverview() {
  const [orders, subscriptions, payments, webhookEvents] = await Promise.all([
    db.select({
      id: commerceOrders.id,
      playerId: commerceOrders.playerId,
      productId: commerceOrders.productId,
      productName: commerceOrders.productName,
      amountTtcCents: commerceOrders.amountTtcCents,
      currency: commerceOrders.currency,
      status: commerceOrders.status,
      stripeMode: commerceOrders.stripeMode,
      withdrawalStatus: commerceOrders.withdrawalStatus,
      purchasedAt: commerceOrders.purchasedAt,
      createdAt: commerceOrders.createdAt,
    }).from(commerceOrders).orderBy(desc(commerceOrders.createdAt)).limit(200),
    db.select({
      id: commerceSubscriptions.stripeSubscriptionId,
      orderId: commerceSubscriptions.orderId,
      playerId: commerceSubscriptions.playerId,
      productId: commerceSubscriptions.productId,
      status: commerceSubscriptions.status,
      currentPeriodEnd: commerceSubscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: commerceSubscriptions.cancelAtPeriodEnd,
      updatedAt: commerceSubscriptions.updatedAt,
    }).from(commerceSubscriptions).orderBy(desc(commerceSubscriptions.updatedAt)).limit(200),
    db.select({
      id: commercePayments.id,
      orderId: commercePayments.orderId,
      amountCents: commercePayments.amountCents,
      refundedAmountCents: commercePayments.refundedAmountCents,
      currency: commercePayments.currency,
      status: commercePayments.status,
      paidAt: commercePayments.paidAt,
      createdAt: commercePayments.createdAt,
    }).from(commercePayments).orderBy(desc(commercePayments.createdAt)).limit(200),
    db.select().from(commerceWebhookEvents)
      .where(inArray(commerceWebhookEvents.status, ["failed", "processing"]))
      .orderBy(desc(commerceWebhookEvents.updatedAt)).limit(200),
  ]);
  return { orders, subscriptions, payments, webhookEvents };
}

export async function requestAdminFullRefund(orderId: string, reason: string) {
  const claimed = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(commerceOrders).where(eq(commerceOrders.id, orderId)).limit(1).for("update");
    if (!order) throw createError({ statusCode: 404, statusMessage: "Commerce order not found" });
    // A retry must always target the same pending refund. Falling through to
    // an older successful subscription payment could refund two periods.
    let [payment] = await tx.select().from(commercePayments)
      .where(and(
        eq(commercePayments.orderId, order.id),
        eq(commercePayments.status, "refund_pending"),
      ))
      .orderBy(desc(commercePayments.updatedAt)).limit(1).for("update");
    if (payment && adminRefundPendingIsRecent(payment.updatedAt)) {
      throw createError({ statusCode: 409, statusMessage: "A Stripe refund is already pending for this order" });
    }
    if (!payment) {
      [payment] = await tx.select().from(commercePayments)
        .where(and(
          eq(commercePayments.orderId, order.id),
          inArray(commercePayments.status, ["succeeded", "partially_refunded"]),
        ))
        .orderBy(desc(commercePayments.paidAt)).limit(1).for("update");
    }
    if (!payment?.stripePaymentIntentId) {
      throw createError({ statusCode: 409, statusMessage: "No refundable settled Stripe payment exists for this order" });
    }
    const remaining = payment.amountCents - payment.refundedAmountCents;
    if (remaining <= 0) throw createError({ statusCode: 409, statusMessage: "Payment is already fully refunded" });
    // Refreshing updated_at also claims a stale retry, so another request will
    // receive 409 instead of issuing the same Stripe call concurrently.
    await tx.update(commercePayments).set({ status: "refund_pending", updatedAt: new Date() }).where(eq(commercePayments.id, payment.id));
    return { order, payment, paymentIntentId: payment.stripePaymentIntentId, remaining };
  });
  const { order, payment, paymentIntentId, remaining } = claimed;
  if (order.stripeMode !== process.env.COMMERCE_STRIPE_MODE) {
    await db.update(commercePayments).set({ status: payment.status, updatedAt: new Date() }).where(eq(commercePayments.id, payment.id));
    throw createError({ statusCode: 409, statusMessage: "Order Stripe mode does not match the runtime mode" });
  }
  try {
    const refund = await stripeClient().refunds.create({
      payment_intent: paymentIntentId,
      amount: remaining,
      reason: "requested_by_customer",
      metadata: {
        cookiebuild_order_id: order.id,
        cookiebuild_admin_reason: reason.slice(0, 120),
      },
    }, { idempotencyKey: `admin-refund:${order.id}:${payment.id}:${payment.refundedAmountCents}:${remaining}` });
    return { orderId: order.id, refundId: refund.id, status: refund.status, amountCents: remaining };
  } catch (error) {
    await db.update(commercePayments).set({ status: payment.status, updatedAt: new Date() })
      .where(and(eq(commercePayments.id, payment.id), eq(commercePayments.status, "refund_pending")));
    throw error;
  }
}

export { reconcileCommerceWebhookEvents, retryCommerceWebhookEvent };
