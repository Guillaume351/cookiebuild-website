import { readBody } from "h3";
import { inviteToParty } from "../../../../services/mobile-social";
import { requireMobileUser } from "../../../../services/mobile-user";
import { exactPlayerName, requireMobileSocialFeature } from "../../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  requireMobileSocialFeature("parties");
  const { auth } = await requireMobileUser(event);
  const body = await readBody<{ playerName?: unknown }>(event);
  const invite = await inviteToParty(auth.uid, exactPlayerName(body?.playerName));
  setResponseStatus(event, 201);
  return { data: invite };
});
