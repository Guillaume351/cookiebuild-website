import { getHeader, getRouterParam, readBody } from "h3";
import { requireMobileCapability } from "../../../../../../services/mobile-capabilities";
import { cancelSkyblockListing } from "../../../../../../services/mobile-skyblock";
import { requireMobileUser } from "../../../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../../../utils/mobile-rate-limit";
import { requiredUuid } from "../../../../../../utils/mobile-validation";
import { cancelListingBody, skyblockIdempotencyKey } from "../../../../../../utils/mobile-skyblock";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("skyblockMarketWrites");
  const { auth } = await requireMobileUser(event);
  enforceMobileRequestRateLimit(`skyblock-market-write:${auth.uid}`, 20, 60_000);
  const listingId = requiredUuid(getRouterParam(event, "id"), "listingId");
  cancelListingBody(await readBody(event));
  const key = skyblockIdempotencyKey(getHeader(event, "idempotency-key"));
  const result = await cancelSkyblockListing(auth.uid, listingId, key);
  setHeader(event, "Cache-Control", "no-store");
  return { data: result.data };
});
