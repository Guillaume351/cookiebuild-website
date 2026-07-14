import { deleteFriendRequest } from "../../../../services/mobile-social";
import { requireMobileUser } from "../../../../services/mobile-user";
import { playerId, requireMobileSocialFeature } from "../../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  requireMobileSocialFeature("friends");
  const { auth } = await requireMobileUser(event);
  return { data: await deleteFriendRequest(auth.uid, playerId(getRouterParam(event, "playerId"))) };
});
