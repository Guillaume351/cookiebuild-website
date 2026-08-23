import { mobileCapabilities, requireMobileCapability } from "../../../services/mobile-capabilities";
import { skyblockOverview } from "../../../services/mobile-skyblock";
import { requireMobileUser } from "../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../utils/mobile-rate-limit";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("skyblockCompanion");
  const { auth } = await requireMobileUser(event);
  await enforceMobileRequestRateLimit(`skyblock-overview:${auth.uid}`, 30, 60_000, { event });
  const capabilities = await mobileCapabilities();
  const overview = await skyblockOverview(auth.uid, capabilities.skyblockMarketWrites);
  setHeader(event, "Cache-Control", "private, no-store");
  return { data: overview };
});
