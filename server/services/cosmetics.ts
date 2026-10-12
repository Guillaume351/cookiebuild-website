import { COSMETIC_CATALOG_RESPONSE, coinCosmeticsOnSale } from "../../shared/cosmetics-catalog";
import { commercePublicLegalIdentity, commerceReadiness } from "../utils/stripe-commerce";

export function publicCosmeticCatalog(now: Date = new Date()) {
  const readiness = commerceReadiness();
  return {
    ...COSMETIC_CATALOG_RESPONSE,
    // Seasonal coin items are listed only during their season (owners keep them).
    coinItems: coinCosmeticsOnSale(now),
    availability: readiness.ready ? "available" as const : "coming_soon" as const,
    purchaseEnabled: readiness.ready,
    checkoutUrl: null,
    commerce: {
      mode: readiness.mode,
      message: readiness.publicMessage,
      requiresMinecraftLink: true,
      seller: commercePublicLegalIdentity(),
    },
  };
}
