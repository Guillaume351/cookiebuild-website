import { acceptPartyInvite } from "../../../../../../services/mobile-social";
import { requireMobileUser } from "../../../../../../services/mobile-user";
import { playerId, requireMobileSocialFeature } from "../../../../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  requireMobileSocialFeature("parties");
  const { auth } = await requireMobileUser(event);
  const inviteId = playerId(getRouterParam(event, "inviteId"), "inviteId");
  return { data: await acceptPartyInvite(auth.uid, inviteId) };
});
