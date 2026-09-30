import { getRequestIP, readBody } from "h3";
import { claimPlayerLink } from "../../../../services/mobile-player-link";
import { recordEngagementCounter } from "../../../../services/mobile-engagement-counters";
import { requireMobileUser } from "../../../../services/mobile-user";
import { enforceLinkClaimRateLimit } from "../../../../utils/mobile-rate-limit";
import { normalizeLinkCode } from "../../../../utils/mobile-validation";

export default defineEventHandler(async (event) => {
  const { auth } = await requireMobileUser(event);
  const requestIp = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
  await enforceLinkClaimRateLimit(`uid:${auth.uid}`, { event });
  await enforceLinkClaimRateLimit(`ip:${requestIp}`, { event });
  const body = await readBody<{ code?: unknown }>(event);
  const link = await claimPlayerLink(auth.uid, normalizeLinkCode(body?.code));
  await recordEngagementCounter("player_link_claimed", link.edition);
  setResponseStatus(event, 201);
  return { data: link };
});
