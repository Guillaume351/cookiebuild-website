import { getHeader, getRouterParam, readBody, setResponseStatus } from "h3";
import { requireMobileCapability } from "../../../../../../services/mobile-capabilities";
import { claimSkyblockPeriodicObjective } from "../../../../../../services/mobile-skyblock";
import { requireMobileUser } from "../../../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../../../utils/mobile-rate-limit";
import {
  objectiveClaimBody,
  skyblockIdempotencyKey,
  skyblockObjectiveCadence,
} from "../../../../../../utils/mobile-skyblock";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("skyblockManagementWrites");
  const { auth } = await requireMobileUser(event);
  await enforceMobileRequestRateLimit(
    `skyblock-management-write:${auth.uid}`,
    20,
    60_000,
    { event, failClosed: true },
  );
  const cadence = skyblockObjectiveCadence(getRouterParam(event, "cadence"));
  const input = objectiveClaimBody(await readBody(event));
  const key = skyblockIdempotencyKey(getHeader(event, "idempotency-key"));
  const result = await claimSkyblockPeriodicObjective(
    auth.uid,
    cadence,
    input,
    key,
  );
  setHeader(event, "Cache-Control", "no-store");
  setResponseStatus(event, result.created ? 201 : 200);
  return { data: result.data };
});
