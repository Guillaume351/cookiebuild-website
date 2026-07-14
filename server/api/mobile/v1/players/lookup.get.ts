import { lookupExactPlayer } from "../../../../services/mobile-social";
import { requireMobileUser } from "../../../../services/mobile-user";
import { exactPlayerName, requireMobileSocialFeature } from "../../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  requireMobileSocialFeature("social");
  const { auth } = await requireMobileUser(event);
  const name = exactPlayerName(getQuery(event).name);
  setHeader(event, "Cache-Control", "no-store");
  return { data: { player: await lookupExactPlayer(auth.uid, name) } };
});
