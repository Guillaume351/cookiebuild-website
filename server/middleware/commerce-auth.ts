import { randomUUID } from "node:crypto";
import { getCookie, getHeader, getRequestIP, getRequestURL } from "h3";
import { verifyCommerceSession } from "../services/commerce-session";
import {
  commerceCsrfCookieName,
  enforceCommerceCsrf,
  enforceCommerceOrigin,
  enforceCommerceRateLimit,
} from "../utils/commerce-security";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;
  if (!path.startsWith("/api/commerce/")) return;

  // Stripe authenticates this machine-to-machine endpoint with the signature
  // over the raw body. Browser cookies, Origin and CSRF do not apply here.
  if (path === "/api/commerce/webhook" && event.method.toUpperCase() === "POST") return;

  event.context.requestId = getHeader(event, "x-request-id")?.slice(0, 64) || randomUUID();
  const ip = getRequestIP(event, { xForwardedFor: true }) || "unknown";
  const isSessionClaim = path === "/api/commerce/session" && event.method.toUpperCase() === "POST";
  enforceCommerceRateLimit(`${isSessionClaim ? "claim" : "api"}:${ip}`, isSessionClaim ? 8 : 180, 60_000);

  if (!SAFE_METHODS.has(event.method.toUpperCase())) {
    enforceCommerceOrigin(event);
    enforceCommerceCsrf(getCookie(event, commerceCsrfCookieName()), getHeader(event, "x-csrf-token"));
  }

  if (path === "/api/commerce/csrf" || isSessionClaim || path === "/api/commerce/recipients"
    || path === "/api/commerce/recovery" || path === "/api/commerce/payer" || path === "/api/commerce/checkout" || path === "/api/commerce/history" || path === "/api/commerce/portal"
    || /^\/api\/commerce\/orders\/[^/]+\/withdraw$/.test(path)) return;
  await verifyCommerceSession(event);
});
