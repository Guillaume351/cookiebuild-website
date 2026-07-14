import { createError } from "h3";

const attempts = new Map<string, { count: number; resetsAt: number }>();

export function enforceLinkClaimRateLimit(key: string, now = Date.now()) {
  if (attempts.size > 10_000) {
    for (const [attemptKey, attempt] of attempts) {
      if (attempt.resetsAt <= now) attempts.delete(attemptKey);
    }
  }

  const current = attempts.get(key);
  if (!current || current.resetsAt <= now) {
    attempts.set(key, { count: 1, resetsAt: now + 10 * 60_000 });
    return;
  }
  if (current.count >= 8) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too many link attempts. Try again later.",
    });
  }
  current.count += 1;
}
