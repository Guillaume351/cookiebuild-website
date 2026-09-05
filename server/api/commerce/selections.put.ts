import { readBody } from "h3";
import { requireCommerceAuth } from "../../services/commerce-session";
import { selectCommerceCosmetic } from "../../services/commerce";

export default defineEventHandler(async (event) => {
  const auth = requireCommerceAuth(event);
  const data = await selectCommerceCosmetic(auth.playerId, await readBody(event));
  setHeader(event, "Cache-Control", "no-store");
  return { data };
});
