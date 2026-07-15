import { randomUUID } from "node:crypto";
import { getCookie, getHeader, getRequestIP, getRequestURL } from "h3";
import { verifyAdminSession } from "../utils/admin-auth";
import {
  adminCsrfCookieName,
  enforceAdminCsrf,
  enforceAdminOrigin,
  enforceAdminRateLimit,
} from "../utils/admin-security";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;
  if (!path.startsWith("/api/admin/")) return;

  event.context.requestId = getHeader(event, "x-request-id")?.slice(0, 64) || randomUUID();
  const ip = getRequestIP(event, { xForwardedFor: true }) || "unknown";
  enforceAdminRateLimit(`api:${ip}`, 240, 60_000);

  const method = event.method.toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    enforceAdminOrigin(event);
    enforceAdminCsrf(getCookie(event, adminCsrfCookieName()), getHeader(event, "x-csrf-token"));
  }

  if (path === "/api/admin/csrf" || path === "/api/admin/auth/login") return;
  await verifyAdminSession(event);
});
