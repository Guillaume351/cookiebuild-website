import { getRouterParam, readBody } from "h3";
import { selectMobileKit } from "../../../../../../services/mobile-kit-shop";
import { requireMobileCapability } from "../../../../../../services/mobile-capabilities";
import { requireMobileUser } from "../../../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../../../utils/mobile-rate-limit";
import { requiredInteger, requiredString } from "../../../../../../utils/mobile-validation";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("kitShop");
  const { auth } = await requireMobileUser(event);
  await enforceMobileRequestRateLimit(`kit-shop-write:${auth.uid}`, 20, 60_000, { event, failClosed: true });
  const gamemode = requiredString(getRouterParam(event, "gamemode"), "gamemode", { maximum: 32 });
  const kitId = requiredString(getRouterParam(event, "kitId"), "kitId", { maximum: 64 });
  const body = await readBody<{ level?: unknown }>(event);
  const level = requiredInteger(body?.level, "level", { minimum: 1, maximum: 3 });
  const shop = await selectMobileKit(auth.uid, gamemode, kitId, level);
  return { data: shop };
});
