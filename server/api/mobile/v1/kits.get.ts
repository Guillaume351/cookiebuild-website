import { mobileKitShopSnapshot } from "../../../services/mobile-kit-shop";
import { requireMobileCapability } from "../../../services/mobile-capabilities";
import { requireMobileUser } from "../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../utils/mobile-rate-limit";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("kitShop");
  const { auth } = await requireMobileUser(event);
  enforceMobileRequestRateLimit(`kit-shop:${auth.uid}`, 60, 60_000);
  const shop = await mobileKitShopSnapshot(auth.uid);
  setHeader(event, "Cache-Control", "private, no-store");
  return { data: shop };
});
