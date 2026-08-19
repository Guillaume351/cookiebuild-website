import { getRouterParam, readBody } from "h3";
import { purchaseMobileKit } from "../../../../../../services/mobile-kit-shop";
import { requireMobileUser } from "../../../../../../services/mobile-user";
import { requiredInteger, requiredString } from "../../../../../../utils/mobile-validation";

export default defineEventHandler(async (event) => {
  const { auth } = await requireMobileUser(event);
  const gamemode = requiredString(getRouterParam(event, "gamemode"), "gamemode", { maximum: 32 });
  const kitId = requiredString(getRouterParam(event, "kitId"), "kitId", { maximum: 64 });
  const body = await readBody<{ level?: unknown }>(event);
  const level = requiredInteger(body?.level, "level", { minimum: 1, maximum: 3 });
  const shop = await purchaseMobileKit(auth.uid, gamemode, kitId, level);
  return { data: shop };
});
