import { randomBytes, timingSafeEqual } from "node:crypto";
import { createError, getHeader, getRequestURL, type H3Event } from "h3";

const rateLimits = new Map<string, { count: number; resetsAt: number }>();
const CSRF_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function adminSessionCookieName(production = process.env.NODE_ENV === "production") {
  return production ? "__Host-cookiebuild_admin" : "cookiebuild_admin";
}

export function adminCsrfCookieName(production = process.env.NODE_ENV === "production") {
  return production ? "__Host-cookiebuild_admin_csrf" : "cookiebuild_admin_csrf";
}

export function createAdminCsrfToken() {
  return randomBytes(32).toString("base64url");
}

export function validAdminCsrfToken(cookieToken: unknown, headerToken: unknown) {
  if (
    typeof cookieToken !== "string"
    || typeof headerToken !== "string"
    || !CSRF_PATTERN.test(cookieToken)
    || !CSRF_PATTERN.test(headerToken)
  ) return false;
  return timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
}

export function enforceAdminCsrf(cookieToken: unknown, headerToken: unknown) {
  if (!validAdminCsrfToken(cookieToken, headerToken)) {
    throw createError({ statusCode: 403, statusMessage: "Invalid CSRF token" });
  }
}

export function enforceAdminOrigin(event: H3Event) {
  const origin = getHeader(event, "origin");
  if (!origin) return;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    throw createError({ statusCode: 403, statusMessage: "Invalid request origin" });
  }
  const forwardedHost = getHeader(event, "x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = (forwardedHost || getHeader(event, "host") || getRequestURL(event).host).toLowerCase();
  if (!requestHost || originHost !== requestHost) {
    throw createError({ statusCode: 403, statusMessage: "Invalid request origin" });
  }
}

export function enforceAdminRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
) {
  if (rateLimits.size > 10_000) {
    for (const [attemptKey, attempt] of rateLimits) {
      if (attempt.resetsAt <= now) rateLimits.delete(attemptKey);
    }
  }
  const current = rateLimits.get(key);
  if (!current || current.resetsAt <= now) {
    rateLimits.set(key, { count: 1, resetsAt: now + windowMs });
    return { remaining: limit - 1, resetsAt: now + windowMs };
  }
  if (current.count >= limit) {
    throw createError({ statusCode: 429, statusMessage: "Too many admin requests. Try again later." });
  }
  current.count += 1;
  return { remaining: limit - current.count, resetsAt: current.resetsAt };
}

export function resetAdminRateLimitsForTests() {
  rateLimits.clear();
}
