import { getRouterParam, readBody } from "h3";
import { retryCommerceWebhookEvent } from "../../../../../services/admin-commerce";
import { requireAdminAuth, requireRecentAdminAuth, writeAdminAudit } from "../../../../../utils/admin-auth";
import { adminText } from "../../../../../utils/admin-validation";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "commerce:write");
  requireRecentAdminAuth(event);
  const eventId = adminText(getRouterParam(event, "id"), "event id", 255);
  const body = await readBody<{ reason?: unknown }>(event);
  const reason = adminText(body?.reason, "reason", 500);
  if (!eventId?.startsWith("evt_") || !reason || reason.length < 8) {
    throw createError({ statusCode: 400, statusMessage: "A Stripe event and meaningful reason are required" });
  }
  const retried = await retryCommerceWebhookEvent(eventId);
  if (!retried) throw createError({ statusCode: 409, statusMessage: "Webhook event is not retryable" });
  await writeAdminAudit(event, "commerce.webhook.retry", "stripe_event", eventId, { reason });
  return { data: { eventId, status: "received" } };
});
