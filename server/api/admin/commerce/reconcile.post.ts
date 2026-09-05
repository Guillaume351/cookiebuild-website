import { readBody } from "h3";
import { reconcileCommerceWebhookEvents } from "../../../services/admin-commerce";
import { requireAdminAuth, requireRecentAdminAuth, writeAdminAudit } from "../../../utils/admin-auth";
import { adminText } from "../../../utils/admin-validation";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "commerce:write");
  requireRecentAdminAuth(event);
  const body = await readBody<{ reason?: unknown }>(event);
  const reason = adminText(body?.reason, "reason", 500);
  if (!reason || reason.length < 8) throw createError({ statusCode: 400, statusMessage: "A meaningful reconciliation reason is required" });
  const reset = await reconcileCommerceWebhookEvents();
  await writeAdminAudit(event, "commerce.webhook.reconcile", "stripe_event_batch", null, { reason, reset });
  return { data: { reset } };
});
