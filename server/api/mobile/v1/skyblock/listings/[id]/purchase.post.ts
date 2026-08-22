import { getHeader, getRouterParam, readBody, setResponseStatus } from "h3";
import { requireMobileCapability } from "../../../../../../services/mobile-capabilities";
import { purchaseSkyblockListing } from "../../../../../../services/mobile-skyblock";
import { requireMobileUser } from "../../../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../../../utils/mobile-rate-limit";
import { requiredUuid } from "../../../../../../utils/mobile-validation";
import { purchaseListingBody, skyblockIdempotencyKey } from "../../../../../../utils/mobile-skyblock";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("skyblockMarketWrites");
  const { auth } = await requireMobileUser(event);
  enforceMobileRequestRateLimit(`skyblock-market-write:${auth.uid}`, 20, 60_000);
  const listingId = requiredUuid(getRouterParam(event, "id"), "listingId");
  const input = purchaseListingBody(await readBody(event));
  const key = skyblockIdempotencyKey(getHeader(event, "idempotency-key"));
  const result = await purchaseSkyblockListing(auth.uid, listingId, input, key);
  setHeader(event, "Cache-Control", "no-store");
  setResponseStatus(event, result.created ? 201 : 200);
  return { data: result.data };
});
