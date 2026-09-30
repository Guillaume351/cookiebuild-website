import { requireMobileCapability } from "../../../../services/mobile-capabilities";
import { dailyChestStatus } from "../../../../services/mobile-rewards";
import { requireMobileUser } from "../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../utils/mobile-rate-limit";

/** App-exclusive daily chest state (Europe/Paris calendar days). */
export default defineEventHandler(async (event) => {
  await requireMobileCapability("dailyRewards");
  const { auth } = await requireMobileUser(event);
  await enforceMobileRequestRateLimit(`daily-chest:${auth.uid}`, 60, 60_000, { event });
  const status = await dailyChestStatus(auth.uid);
  setHeader(event, "Cache-Control", "private, no-store");
  return { data: status };
});
