import { readBody } from "h3";
import { createCommerceCheckout, type CheckoutInput } from "../../services/commerce";
import { requireCommerceAuth } from "../../services/commerce-session";

export default defineEventHandler(async (event) => {
  const auth = requireCommerceAuth(event);
  const result = await createCommerceCheckout(auth, await readBody<CheckoutInput>(event));
  setHeader(event, "Cache-Control", "no-store");
  return { data: result };
});
