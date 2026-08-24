import { getHeader, getRouterParam, readBody, setResponseStatus } from "h3";
import { requireMobileCapability } from "../../../../../../services/mobile-capabilities";
import { upgradeSkyblockWorker } from "../../../../../../services/mobile-skyblock";
import { requireMobileUser } from "../../../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../../../utils/mobile-rate-limit";
import {
  workerUpgradeBody,
  skyblockIdempotencyKey,
} from "../../../../../../utils/mobile-skyblock";
import { requiredUuid } from "../../../../../../utils/mobile-validation";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("skyblockManagementWrites");
  const { auth } = await requireMobileUser(event);
  await enforceMobileRequestRateLimit(
    `skyblock-management-write:${auth.uid}`,
    20,
    60_000,
    { event, failClosed: true },
  );
  const workerId = requiredUuid(getRouterParam(event, "id"), "workerId");
  const input = workerUpgradeBody(await readBody(event));
  const key = skyblockIdempotencyKey(getHeader(event, "idempotency-key"));
  const result = await upgradeSkyblockWorker(auth.uid, workerId, input, key);
  setHeader(event, "Cache-Control", "no-store");
  setResponseStatus(event, result.created ? 201 : 200);
  return { data: result.data };
});
