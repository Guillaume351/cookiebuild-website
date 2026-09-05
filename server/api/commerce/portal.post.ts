import { createCommercePortal } from "../../services/commerce";
import { requireCommerceAuth } from "../../services/commerce-session";

export default defineEventHandler(async (event) => {
  const result = await createCommercePortal(requireCommerceAuth(event));
  setHeader(event, "Cache-Control", "no-store");
  return { data: result };
});
