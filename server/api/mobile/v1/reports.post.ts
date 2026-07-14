import { readBody } from "h3";
import { reportPlayer } from "../../../services/mobile-social";
import { requireMobileUser } from "../../../services/mobile-user";
import {
  playerId,
  reportReason,
  requireMobileSocialFeature,
} from "../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  requireMobileSocialFeature("social");
  const { auth } = await requireMobileUser(event);
  const body = await readBody<{ playerId?: unknown; reason?: unknown }>(event);
  const report = await reportPlayer(auth.uid, playerId(body?.playerId), reportReason(body?.reason));
  setResponseStatus(event, 201);
  return { data: report };
});
