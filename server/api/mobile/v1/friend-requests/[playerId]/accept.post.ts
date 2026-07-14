import { acceptFriendRequest } from "../../../../../services/mobile-social";
import { requireMobileUser } from "../../../../../services/mobile-user";
import { playerId, requireMobileSocialFeature } from "../../../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  requireMobileSocialFeature("friends");
  const { auth } = await requireMobileUser(event);
  const requesterId = playerId(getRouterParam(event, "playerId"));
  return { data: await acceptFriendRequest(auth.uid, requesterId) };
});
