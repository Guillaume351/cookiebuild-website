import { commerceInventory } from "../../services/commerce";
import { requireCommerceAuth } from "../../services/commerce-session";

export default defineEventHandler(async (event) => {
  const data = await commerceInventory(requireCommerceAuth(event).playerId);
  setHeader(event, "Cache-Control", "no-store");
  return { data };
});
