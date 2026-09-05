import { getRouterParam, readBody } from "h3";
import { requestAdminFullRefund } from "../../../../../services/admin-commerce";
import { requireAdminAuth, requireRecentAdminAuth, writeAdminAudit } from "../../../../../utils/admin-auth";
import { adminText } from "../../../../../utils/admin-validation";
import { requiredUuid } from "../../../../../utils/mobile-validation";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "commerce:write");
  requireRecentAdminAuth(event);
  const orderId = requiredUuid(getRouterParam(event, "id"), "order id");
  const body = await readBody<{ reason?: unknown }>(event);
  const reason = adminText(body?.reason, "reason", 500);
  if (!reason || reason.length < 8) throw createError({ statusCode: 400, statusMessage: "A meaningful refund reason is required" });
  try {
    const result = await requestAdminFullRefund(orderId, reason);
    await writeAdminAudit(event, "commerce.refund.requested", "commerce_order", orderId, {
      reason,
      amountCents: result.amountCents,
      refundId: result.refundId,
    });
    return { data: result };
  } catch (error) {
    await writeAdminAudit(event, "commerce.refund.failed", "commerce_order", orderId, { reason });
    throw error;
  }
});
