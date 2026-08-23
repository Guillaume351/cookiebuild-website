import { getHeader, readBody, setResponseStatus } from "h3";
import { requireMobileCapability } from "../../../../../services/mobile-capabilities";
import { upgradeSkyblockGenerator } from "../../../../../services/mobile-skyblock";
import { requireMobileUser } from "../../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../../utils/mobile-rate-limit";
import { generatorUpgradeBody, skyblockIdempotencyKey } from "../../../../../utils/mobile-skyblock";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("skyblockManagementWrites");
  const { auth } = await requireMobileUser(event);
  await enforceMobileRequestRateLimit(`skyblock-management-write:${auth.uid}`, 20, 60_000, { event, failClosed: true });
  const input = generatorUpgradeBody(await readBody(event));
  const key = skyblockIdempotencyKey(getHeader(event, "idempotency-key"));
  const result = await upgradeSkyblockGenerator(auth.uid, input, key);
  setHeader(event, "Cache-Control", "no-store");
  setResponseStatus(event, result.created ? 201 : 200);
  return { data: result.data };
});
