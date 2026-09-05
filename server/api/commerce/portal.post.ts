import { createCommercePortal } from "../../services/commerce";
import { resolveCommercePayer } from "../../services/commerce-payer";

export default defineEventHandler(async (event) => {
  const result = await createCommercePortal(await resolveCommercePayer(event));
  setHeader(event, "Cache-Control", "no-store");
  return { data: result };
});
