import { removePartyMember } from "../../../../../services/mobile-social";
import { requireMobileUser } from "../../../../../services/mobile-user";
import { playerId, requireMobileSocialFeature } from "../../../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  requireMobileSocialFeature("parties");
  const { auth } = await requireMobileUser(event);
  return { data: await removePartyMember(auth.uid, playerId(getRouterParam(event, "playerId"))) };
});
