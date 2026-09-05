import { createHash } from "node:crypto";
import { createError, setHeader, type H3Event } from "h3";
import { createMemoryRateLimitStore } from "./mobile-memory-rate-limit";

export interface MobileRateLimitResult {
  allowed: boolean;
  resetsAt: Date;
}

export interface MobileRateLimitStore {
  consume(input: {
    keyHash: string;
    limit: number;
    windowMs: number;
    now: Date;
  }): Promise<MobileRateLimitResult>;
}

interface RateLimitOptions {
  event?: H3Event;
  failClosed?: boolean;
  now?: number;
  store?: MobileRateLimitStore;
}

const fallbackStore = createMemoryRateLimitStore();

async function defaultStore(): Promise<MobileRateLimitStore> {
  const { postgresMobileRateLimitStore } = await import("../services/mobile-rate-limit-store");
  return postgresMobileRateLimitStore;
}

export async function enforceMobileRequestRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  options: RateLimitOptions = {},
) {
  const now = options.now ?? Date.now();
  const keyHash = createHash("sha256").update(key).digest("hex");
  let result: MobileRateLimitResult;
  try {
    const store = options.store ?? await defaultStore();
    result = await store.consume({ keyHash, limit, windowMs, now: new Date(now) });
  } catch (error) {
    if (options.failClosed) {
      console.error("mobile_rate_limit_store_unavailable", {
        error: error instanceof Error ? error.message : "unknown",
      });
      if (options.event) setHeader(options.event, "Retry-After", 5);
      throw createError({
        statusCode: 503,
        statusMessage: "Request protection is temporarily unavailable. Try again later.",
      });
    }
    result = await fallbackStore.consume({ keyHash, limit, windowMs, now: new Date(now) });
  }

  if (!result.allowed) {
    const retryAfter = Math.max(1, Math.ceil((result.resetsAt.getTime() - now) / 1_000));
    if (options.event) setHeader(options.event, "Retry-After", retryAfter);
    throw createError({
      statusCode: 429,
      statusMessage: "Too many requests. Try again later.",
    });
  }
}

export function enforceLinkClaimRateLimit(key: string, options: RateLimitOptions = {}) {
  return enforceMobileRequestRateLimit(key, 8, 10 * 60_000, {
    ...options,
    failClosed: true,
  });
}
