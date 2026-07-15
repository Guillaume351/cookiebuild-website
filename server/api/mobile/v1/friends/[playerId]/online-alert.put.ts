import { readBody } from "h3";
import { setFriendOnlineAlert } from "../../../../../services/mobile-engagement";
import { requireMobileUser } from "../../../../../services/mobile-user";
import { requiredBoolean, requiredUuid } from "../../../../../utils/mobile-validation";
import { requireMobileSocialFeature } from "../../../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  requireMobileSocialFeature("friends");
  const { auth } = await requireMobileUser(event);
  const playerId = requiredUuid(getRouterParam(event, "playerId"), "playerId");
  const body = await readBody<{ enabled?: unknown }>(event);
  const data = await setFriendOnlineAlert(auth.uid, playerId, requiredBoolean(body?.enabled, "enabled"));
  return { data };
});
