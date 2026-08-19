import { createError } from "h3";

const attempts = new Map<string, { count: number; resetsAt: number }>();

export function enforceMobileRequestRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
) {
  if (attempts.size > 10_000) {
    for (const [attemptKey, attempt] of attempts) {
      if (attempt.resetsAt <= now) attempts.delete(attemptKey);
    }
  }

  const current = attempts.get(key);
  if (!current || current.resetsAt <= now) {
    attempts.set(key, { count: 1, resetsAt: now + windowMs });
    return;
  }
  if (current.count >= limit) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too many requests. Try again later.",
    });
  }
  current.count += 1;
}

export function enforceLinkClaimRateLimit(key: string, now = Date.now()) {
  enforceMobileRequestRateLimit(key, 8, 10 * 60_000, now);
}
