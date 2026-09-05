import { COSMETIC_CATALOG_RESPONSE } from "../../shared/cosmetics-catalog";
import { commercePublicLegalIdentity, commerceReadiness } from "../utils/stripe-commerce";

export function publicCosmeticCatalog() {
  const readiness = commerceReadiness();
  return {
    ...COSMETIC_CATALOG_RESPONSE,
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
