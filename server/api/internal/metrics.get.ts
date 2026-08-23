import { timingSafeEqual } from "node:crypto";
import { getHeader, setHeader } from "h3";
import { renderMobileMetrics } from "../../utils/mobile-observability";

function validToken(provided: string | undefined, expected: string | undefined) {
  if (!provided || !expected || expected.length < 32) return false;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}

export default defineEventHandler((event) => {
  const authorization = getHeader(event, "authorization");
  const provided = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  if (!process.env.COOKIEBUILD_METRICS_TOKEN) {
    throw createError({ statusCode: 503, statusMessage: "Metrics endpoint is not configured" });
  }
  if (!validToken(provided, process.env.COOKIEBUILD_METRICS_TOKEN)) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }
  setHeader(event, "Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  setHeader(event, "Cache-Control", "no-store");
  return renderMobileMetrics();
});
