import { createHash } from "node:crypto";

export const ADMIN_REFUND_PENDING_STALE_MS = 15 * 60 * 1_000;

export function adminRefundPendingIsRecent(updatedAt: Date, now = new Date()) {
  return updatedAt.getTime() > now.getTime() - ADMIN_REFUND_PENDING_STALE_MS;
}

export function immutableOrderGrants(access: string, grantsSnapshot: unknown) {
  if (!Array.isArray(grantsSnapshot)
    || grantsSnapshot.some((grant) => typeof grant !== "string" || !/^[a-z0-9_]{3,64}$/.test(grant))
    || new Set(grantsSnapshot).size !== grantsSnapshot.length
    || (access === "none" ? grantsSnapshot.length !== 0 : grantsSnapshot.length === 0)) {
    throw new Error("Invalid immutable order grant snapshot");
  }
  return [...grantsSnapshot] as string[];
}

export function invoiceEntitlementSource(orderId: string, invoiceId: string) {
  const suffix = createHash("sha256").update(invoiceId).digest("hex").slice(0, 20);
  return `stripe:invoice:${orderId}:${suffix}`;
}

export function subscriptionOrderStatus(status: string, cancelAtPeriodEnd: boolean) {
  if (["canceled", "incomplete_expired", "unpaid"].includes(status)) return "terminal" as const;
  if (cancelAtPeriodEnd) return "canceling" as const;
  if (["active", "trialing"].includes(status)) return "active" as const;
  if (["past_due", "incomplete", "paused"].includes(status)) return "past_due" as const;
  return "checkout_open" as const;
}

export function authoritativeSubscriptionOrderStatus(status: string, cancelAtPeriodEnd: boolean) {
  const mapped = subscriptionOrderStatus(status, cancelAtPeriodEnd);
  if (mapped === "terminal") return status === "canceled" ? "canceled" as const : "expired" as const;
  return mapped;
}

export function synchronizedSubscriptionOrderStatus(
  currentOrderStatus: string,
  stripeStatus: string,
  cancelAtPeriodEnd: boolean,
) {
  const next = authoritativeSubscriptionOrderStatus(stripeStatus, cancelAtPeriodEnd);
  if (["canceled", "expired"].includes(next)) return next;
  if (["refunded", "disputed", "canceled", "expired"].includes(currentOrderStatus)) return currentOrderStatus;
  return next;
}

export function preserveTerminalSubscriptionOrderStatus(currentOrderStatus: string, proposedStatus: string) {
  return ["canceled", "expired", "refunded"].includes(currentOrderStatus)
    ? currentOrderStatus
    : proposedStatus;
}

export function canRestoreSubscriptionDispute(authoritativeOrderStatus: string | null) {
  return authoritativeOrderStatus !== null
    && ["active", "canceling", "past_due"].includes(authoritativeOrderStatus);
}

export function orderStatusAfterRefund(
  access: string,
  currentOrderStatus: string,
  refundStatus: string,
  full: boolean,
  withdrawalRequested: boolean,
) {
  if (refundStatus !== "succeeded") return currentOrderStatus;
  if (access === "subscription") return full && withdrawalRequested ? "refunded" : currentOrderStatus;
  return full ? "refunded" : "partially_refunded";
}

export function shouldGrantInvoiceCoverage(
  invoiceStatus: string,
  coverageEnd: Date | null,
  subscriptionStatus: string | null,
  now = new Date(),
) {
  return invoiceStatus === "paid"
    && coverageEnd !== null
    && coverageEnd > now
    && !["canceled", "incomplete_expired", "unpaid"].includes(subscriptionStatus || "");
}

export function canRestoreWonDispute(orderStatus: string, paymentStatus: string | null) {
  return !["refunded", "canceled", "expired"].includes(orderStatus)
    && paymentStatus !== "refunded"
    && paymentStatus !== "dispute_lost";
}
