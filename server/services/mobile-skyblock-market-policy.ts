import { skyblockError } from "../utils/mobile-skyblock";

/** Must stay aligned with gameplay MarketPolicy. */
export const SKYBLOCK_MARKET_FEE_BPS = 500;
export const SKYBLOCK_LISTING_TTL_HOURS = 48;

export function skyblockMarketSettlement(priceCoins: number) {
  if (!Number.isSafeInteger(priceCoins) || priceCoins < 1) {
    throw skyblockError(
      400,
      "INVALID_REQUEST",
      "Listing price must be a positive integer",
    );
  }
  const feeCoins = Math.max(
    1,
    Math.ceil((priceCoins * SKYBLOCK_MARKET_FEE_BPS) / 10_000),
  );
  const netCoins = priceCoins - feeCoins;
  if (netCoins < 1) {
    throw skyblockError(
      400,
      "INVALID_REQUEST",
      "Listing proceeds must be positive after fees",
    );
  }
  return { feeCoins, netCoins };
}
