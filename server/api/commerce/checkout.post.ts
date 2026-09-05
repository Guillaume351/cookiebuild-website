import { readBody } from "h3";
import { createCommerceCheckout, type CheckoutInput } from "../../services/commerce";
import { resolveCommercePayer } from "../../services/commerce-payer";

export default defineEventHandler(async (event) => {
  const auth = await resolveCommercePayer(event, true);
  const result = await createCommerceCheckout(auth, await readBody<CheckoutInput>(event));
  setHeader(event, "Cache-Control", "no-store");
  return { data: result };
});
