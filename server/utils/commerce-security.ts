import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createError, getHeader, getRequestURL, type H3Event } from "h3";

const rateLimits = new Map<string, { count: number; resetsAt: number }>();
let sweepCursor = rateLimits.entries();
const SWEEP_BUDGET = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function commerceSessionCookieName(production = process.env.NODE_ENV === "production") {
  return production ? "__Host-cookiebuild_commerce" : "cookiebuild_commerce";
}

export function commerceCsrfCookieName(production = process.env.NODE_ENV === "production") {
  return production ? "__Host-cookiebuild_commerce_csrf" : "cookiebuild_commerce_csrf";
}

export function createCommerceToken() {
  return randomBytes(32).toString("base64url");
}

export function hashCommerceToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function validCommerceToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function validCommerceCsrfToken(cookieToken: unknown, headerToken: unknown) {
  if (!validCommerceToken(cookieToken) || !validCommerceToken(headerToken)) return false;
  return timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
}

export function enforceCommerceCsrf(cookieToken: unknown, headerToken: unknown) {
  if (!validCommerceCsrfToken(cookieToken, headerToken)) {
    throw createError({ statusCode: 403, statusMessage: "Invalid CSRF token" });
  }
}

export function enforceCommerceOrigin(event: H3Event) {
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

export function enforceCommerceRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  // Keep per-request work bounded even when attackers fill the capacity.
  for (let inspected = 0; inspected < SWEEP_BUDGET; inspected++) {
    const entry = sweepCursor.next();
    if (entry.done) { sweepCursor = rateLimits.entries(); break; }
    if (entry.value[1].resetsAt <= now) rateLimits.delete(entry.value[0]);
  }
  const current = rateLimits.get(key);
  if (!current || current.resetsAt <= now) {
    if (!current && rateLimits.size >= 10_000) throw createError({ statusCode: 429, statusMessage: "Too many commerce requests. Try again later." });
    rateLimits.set(key, { count: 1, resetsAt: now + windowMs });
    return;
  }
  if (current.count >= limit) {
    throw createError({ statusCode: 429, statusMessage: "Too many commerce requests. Try again later." });
  }
  current.count += 1;
}

export function resetCommerceRateLimitsForTests() {
  rateLimits.clear();
  sweepCursor = rateLimits.entries();
}
