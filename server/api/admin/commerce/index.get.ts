import { adminCommerceOverview } from "../../../services/admin-commerce";
import { requireAdminAuth } from "../../../utils/admin-auth";
import { commerceReadiness } from "../../../utils/stripe-commerce";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "commerce:read");
  const data = await adminCommerceOverview();
  setHeader(event, "Cache-Control", "no-store");
  return { data: { ...data, readiness: commerceReadiness() } };
});
