import { getHeader, getRouterParam, readBody, setResponseStatus } from "h3";
import { sellToSkyblockMerchant } from "../../../../../../services/mobile-skyblock";
import { requireMobileCapability } from "../../../../../../services/mobile-capabilities";
import { requireMobileUser } from "../../../../../../services/mobile-user";
import {
  merchantSaleBody,
  skyblockIdempotencyKey,
  skyblockItemId,
} from "../../../../../../utils/mobile-skyblock";
import { enforceMobileRequestRateLimit } from "../../../../../../utils/mobile-rate-limit";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("skyblockManagementWrites");
  const { auth } = await requireMobileUser(event);
  await enforceMobileRequestRateLimit(
    `skyblock-merchant-write:${auth.uid}`,
    20,
    60_000,
    { event, failClosed: true },
  );
  const result = await sellToSkyblockMerchant(
    auth.uid,
    skyblockItemId(getRouterParam(event, "id")),
    merchantSaleBody(await readBody(event)),
    skyblockIdempotencyKey(getHeader(event, "idempotency-key")),
  );
  setResponseStatus(event, result.created ? 201 : 200);
  return { data: result.data };
});
