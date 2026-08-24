import { skyblockMerchant } from "../../../../services/mobile-skyblock";
import { requireMobileCapability } from "../../../../services/mobile-capabilities";
import { requireMobileUser } from "../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../utils/mobile-rate-limit";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("skyblockCompanion");
  const { auth } = await requireMobileUser(event);
  await enforceMobileRequestRateLimit(
    `skyblock-merchant:${auth.uid}`,
    30,
    60_000,
    { event },
  );
  return { data: await skyblockMerchant(auth.uid) };
});
