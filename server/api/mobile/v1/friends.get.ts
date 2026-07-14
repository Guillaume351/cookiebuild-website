import { friendsSnapshot } from "../../../services/mobile-social";
import { requireMobileUser } from "../../../services/mobile-user";
import { requireMobileSocialFeature } from "../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  requireMobileSocialFeature("friends");
  const { auth } = await requireMobileUser(event);
  setHeader(event, "Cache-Control", "no-store");
  return { data: await friendsSnapshot(auth.uid) };
});
