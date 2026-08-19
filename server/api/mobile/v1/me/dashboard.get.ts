import { mobilePlayerDashboard } from "../../../../services/mobile-player-dashboard";
import { requireMobileCapability } from "../../../../services/mobile-capabilities";
import { requireMobileUser } from "../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../utils/mobile-rate-limit";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("playerDashboard");
  const { auth } = await requireMobileUser(event);
  enforceMobileRequestRateLimit(`player-dashboard:${auth.uid}`, 30, 60_000);
  const dashboard = await mobilePlayerDashboard(auth.uid);
  setHeader(event, "Cache-Control", "private, no-store");
  return { data: dashboard };
});
