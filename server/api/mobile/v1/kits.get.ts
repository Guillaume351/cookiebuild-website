import { mobileKitShopSnapshot } from "../../../services/mobile-kit-shop";
import { requireMobileUser } from "../../../services/mobile-user";

export default defineEventHandler(async (event) => {
  const { auth } = await requireMobileUser(event);
  const shop = await mobileKitShopSnapshot(auth.uid);
  setHeader(event, "Cache-Control", "private, no-store");
  return { data: shop };
});
