import { mobilePresenceSnapshot } from "../../../services/mobile-engagement";
import { requireMobileUser } from "../../../services/mobile-user";
import { requireMobileSocialFeature } from "../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  requireMobileSocialFeature("social");
  const { auth } = await requireMobileUser(event);
  const data = await mobilePresenceSnapshot(auth.uid);
  setHeader(event, "Cache-Control", "private, no-store");
  return { data };
});
