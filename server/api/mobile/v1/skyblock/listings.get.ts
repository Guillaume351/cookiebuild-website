import { getQuery } from "h3";
import { requireMobileCapability } from "../../../../services/mobile-capabilities";
import { skyblockListings } from "../../../../services/mobile-skyblock";
import { requireMobileUser } from "../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../utils/mobile-rate-limit";
import { skyblockListingsQuery } from "../../../../utils/mobile-skyblock";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("skyblockCompanion");
  const { auth } = await requireMobileUser(event);
  enforceMobileRequestRateLimit(`skyblock-listings:${auth.uid}`, 60, 60_000);
  const listings = await skyblockListings(auth.uid, skyblockListingsQuery(getQuery(event)));
  setHeader(event, "Cache-Control", "private, no-store");
  return { data: listings };
});
