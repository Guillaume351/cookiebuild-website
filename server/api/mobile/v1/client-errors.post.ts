import { getRequestIP, readBody, sendNoContent } from "h3";
import { optionalMobileAuth } from "../../../utils/mobile-auth";
import { parseClientErrorReport } from "../../../utils/mobile-client-errors";
import { recordMobileClientError } from "../../../utils/mobile-observability";
import { enforceMobileRequestRateLimit } from "../../../utils/mobile-rate-limit";

/**
 * Crash and error reports from the app. Reports are scrubbed, truncated and
 * written to the structured log only; no identity or IP address is recorded.
 */
export default defineEventHandler(async (event) => {
  const auth = optionalMobileAuth(event);
  const requestIp = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
  if (auth) {
    await enforceMobileRequestRateLimit(`client-errors:uid:${auth.uid}`, 30, 10 * 60_000, { event });
  }
  await enforceMobileRequestRateLimit(`client-errors:ip:${requestIp}`, 60, 10 * 60_000, { event });
  const report = parseClientErrorReport(await readBody(event));
  recordMobileClientError(report.platform, report.appVersion);
  console.warn("[mobile-client-error]", JSON.stringify({
    event: "client_error",
    platform: report.platform,
    appVersion: report.appVersion,
    authenticated: Boolean(auth),
    route: report.route,
    message: report.message,
    stack: report.stack,
  }));
  return sendNoContent(event, 204);
});
