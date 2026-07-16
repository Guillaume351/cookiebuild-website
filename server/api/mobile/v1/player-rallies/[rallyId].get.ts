import { getRouterParam, setHeader } from "h3";
import { getPlayerRally } from "../../../../services/mobile-rallies";
import { requireMobileUser } from "../../../../services/mobile-user";
import { playerId } from "../../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  const { auth } = await requireMobileUser(event);
  const rallyId = playerId(getRouterParam(event, "rallyId"), "rallyId");
  setHeader(event, "Cache-Control", "no-store");
  return { data: await getPlayerRally(auth.uid, rallyId) };
});
