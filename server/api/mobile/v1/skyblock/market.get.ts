import { getQuery } from "h3";
import { requireMobileCapability } from "../../../../services/mobile-capabilities";
import { skyblockMarket } from "../../../../services/mobile-skyblock";
import { requireMobileUser } from "../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../utils/mobile-rate-limit";
import { skyblockMarketQuery } from "../../../../utils/mobile-skyblock";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("skyblockCompanion");
  const { auth } = await requireMobileUser(event);
  await enforceMobileRequestRateLimit(`skyblock-market:${auth.uid}`, 60, 60_000, { event });
  const market = await skyblockMarket(auth.uid, skyblockMarketQuery(getQuery(event)));
  setHeader(event, "Cache-Control", "private, no-store");
  return { data: market };
});
