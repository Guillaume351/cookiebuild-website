import { createError, getQuery, getRouterParam, readBody, setHeader, type H3Event } from "h3";
import { BUILD_REPORT_REASONS, type BuildReportReason } from "../../shared/buildbattle-gallery";
import { reportGalleryBuild, setGalleryLike } from "../services/buildbattle-gallery";
import { enforceGallerySameOrigin, requestIp, requireGalleryIdentity } from "./identity";
import { parseShortCode } from "./query";
import { enforceGalleryLikeLimits, enforceGalleryReportLimits } from "./rate-limit";

export function routeShortCode(event: H3Event) {
  return parseShortCode(getRouterParam(event, "code"));
}

/** POST/DELETE /api/builds/<code>/like */
export async function handleGalleryLike(event: H3Event, liked: boolean) {
  const shortCode = routeShortCode(event);
  enforceGallerySameOrigin(event);
  const identity = await requireGalleryIdentity(event);
  await enforceGalleryLikeLimits(event, requestIp(event), identity);
  setHeader(event, "Cache-Control", "no-store");
  return { data: await setGalleryLike(shortCode, identity.key, liked) };
}

export function parseReportReason(body: unknown): BuildReportReason {
  const reason = body && typeof body === "object" ? (body as { reason?: unknown }).reason : undefined;
  if (typeof reason !== "string" || !(BUILD_REPORT_REASONS as readonly string[]).includes(reason)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid report reason" });
  }
  return reason as BuildReportReason;
}

/** POST /api/builds/<code>/report → 204 */
export async function handleGalleryReport(event: H3Event) {
  const shortCode = routeShortCode(event);
  enforceGallerySameOrigin(event);
  const reason = parseReportReason(await readBody(event).catch(() => null));
  const identity = await requireGalleryIdentity(event);
  await enforceGalleryReportLimits(event, requestIp(event), identity, shortCode);
  await reportGalleryBuild(shortCode, identity.key, reason);
  setHeader(event, "Cache-Control", "no-store");
}

export function queryLocale(event: H3Event) {
  return getQuery(event).locale;
}
