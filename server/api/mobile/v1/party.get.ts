import { partySnapshot } from "../../../services/mobile-social";
import { requireMobileUser } from "../../../services/mobile-user";
import { requireMobileSocialFeature } from "../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  requireMobileSocialFeature("parties");
  const { auth } = await requireMobileUser(event);
  setHeader(event, "Cache-Control", "no-store");
  return { data: await partySnapshot(auth.uid) };
});
