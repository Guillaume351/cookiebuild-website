import { readBody, setResponseStatus } from "h3";
import { requireMobileCapability } from "../../../../services/mobile-capabilities";
import { createSkyblockListingQuote } from "../../../../services/mobile-skyblock";
import { requireMobileUser } from "../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../utils/mobile-rate-limit";
import { listingQuoteBody } from "../../../../utils/mobile-skyblock";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("skyblockMarketWrites");
  const { auth } = await requireMobileUser(event);
  await enforceMobileRequestRateLimit(`skyblock-market-write:${auth.uid}`, 20, 60_000, { event, failClosed: true });
  const quote = await createSkyblockListingQuote(auth.uid, listingQuoteBody(await readBody(event)));
  setHeader(event, "Cache-Control", "no-store");
  setResponseStatus(event, 201);
  return { data: quote };
});
