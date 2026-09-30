import { requireMobileCapability } from "../../../../../services/mobile-capabilities";
import { recordEngagementCounter } from "../../../../../services/mobile-engagement-counters";
import { claimDailyChest } from "../../../../../services/mobile-rewards";
import { requireMobileUser } from "../../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../../utils/mobile-rate-limit";

/** Opens today's chest: 200 when granted, 409 when already opened, 403 when unlinked. */
export default defineEventHandler(async (event) => {
  await requireMobileCapability("dailyRewards");
  const { auth } = await requireMobileUser(event);
  await enforceMobileRequestRateLimit(`daily-chest-claim:${auth.uid}`, 10, 10 * 60_000, { event });
  const claim = await claimDailyChest(auth.uid);
  await recordEngagementCounter("daily_chest_claimed", `day_${claim.granted.day}`);
  setHeader(event, "Cache-Control", "private, no-store");
  return { data: claim };
});
