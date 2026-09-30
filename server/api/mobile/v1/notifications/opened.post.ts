import { createError, getRequestIP, readBody, sendNoContent } from "h3";
import {
  countedNotificationKind,
  incrementEngagementCounter,
} from "../../../../services/mobile-engagement-counters";
import { optionalMobileAuth } from "../../../../utils/mobile-auth";
import { enforceMobileRequestRateLimit } from "../../../../utils/mobile-rate-limit";

/** Aggregated "notification opened" counter by kind; nothing identifies the user. */
export default defineEventHandler(async (event) => {
  const auth = optionalMobileAuth(event);
  const requestIp = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
  await enforceMobileRequestRateLimit(
    auth ? `notification-opened:uid:${auth.uid}` : `notification-opened:ip:${requestIp}`,
    60,
    10 * 60_000,
    { event },
  );
  const body = await readBody<{ kind?: unknown; notificationId?: unknown }>(event);
  if (typeof body?.kind !== "string" || !body.kind.trim() || body.kind.length > 64) {
    throw createError({ statusCode: 400, statusMessage: "Invalid kind" });
  }
  if (
    body.notificationId !== undefined && body.notificationId !== null
    && (typeof body.notificationId !== "string" || body.notificationId.length > 128)
  ) {
    throw createError({ statusCode: 400, statusMessage: "Invalid notificationId" });
  }
  try {
    await incrementEngagementCounter("notification_opened", countedNotificationKind(body.kind));
  } catch (error) {
    console.warn("[mobile-engagement-counters]", JSON.stringify({
      event: "notification_opened_write_failed",
      message: (error instanceof Error ? error.message : String(error)).slice(0, 200),
    }));
    throw createError({ statusCode: 503, statusMessage: "Engagement counters are unavailable" });
  }
  return sendNoContent(event, 204);
});
