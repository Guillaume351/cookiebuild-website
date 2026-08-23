import { getHeader, getRouterParam, readBody, setResponseStatus } from "h3";
import { requireMobileCapability } from "../../../../../../services/mobile-capabilities";
import { claimSkyblockQuest } from "../../../../../../services/mobile-skyblock";
import { requireMobileUser } from "../../../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../../../utils/mobile-rate-limit";
import {
  emptySkyblockMutationBody,
  skyblockIdempotencyKey,
  skyblockQuestId,
} from "../../../../../../utils/mobile-skyblock";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("skyblockManagementWrites");
  const { auth } = await requireMobileUser(event);
  await enforceMobileRequestRateLimit(`skyblock-management-write:${auth.uid}`, 20, 60_000, { event, failClosed: true });
  const questId = skyblockQuestId(getRouterParam(event, "id"));
  emptySkyblockMutationBody(await readBody(event));
  const key = skyblockIdempotencyKey(getHeader(event, "idempotency-key"));
  const result = await claimSkyblockQuest(auth.uid, questId, key);
  setHeader(event, "Cache-Control", "no-store");
  setResponseStatus(event, result.created ? 201 : 200);
  return { data: result.data };
});
