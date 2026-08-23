import { mobileCapabilities, requireMobileCapability } from "../../../../services/mobile-capabilities";
import { skyblockManagementOverview } from "../../../../services/mobile-skyblock";
import { requireMobileUser } from "../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../utils/mobile-rate-limit";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("skyblockCompanion");
  const { auth } = await requireMobileUser(event);
  enforceMobileRequestRateLimit(`skyblock-management:${auth.uid}`, 30, 60_000);
  const capabilities = await mobileCapabilities();
  const management = await skyblockManagementOverview(auth.uid, capabilities.skyblockManagementWrites);
  setHeader(event, "Cache-Control", "private, no-store");
  return { data: management };
});
