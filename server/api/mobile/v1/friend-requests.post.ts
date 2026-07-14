import { readBody } from "h3";
import { sendFriendRequest } from "../../../services/mobile-social";
import { requireMobileUser } from "../../../services/mobile-user";
import { exactPlayerName, requireMobileSocialFeature } from "../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  requireMobileSocialFeature("friends");
  const { auth } = await requireMobileUser(event);
  const body = await readBody<{ playerName?: unknown }>(event);
  const request = await sendFriendRequest(auth.uid, exactPlayerName(body?.playerName));
  setResponseStatus(event, request.status === "accepted" ? 200 : 201);
  return { data: request };
});
