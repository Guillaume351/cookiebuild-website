import type { MobileRateLimitStore } from "./mobile-rate-limit";

export function createMemoryRateLimitStore(maximumEntries = 10_000): MobileRateLimitStore {
  const attempts = new Map<string, { count: number; resetsAt: Date }>();
  let sweep = attempts.entries();

  return {
    async consume({ keyHash, limit, windowMs, now }) {
      // Spread expiration work across requests, even when every entry is active.
      for (let checked = 0; checked < 16; checked += 1) {
        const entry = sweep.next();
        if (entry.done) {
          sweep = attempts.entries();
          break;
        }
        if (entry.value[1].resetsAt <= now) attempts.delete(entry.value[0]);
      }

      const current = attempts.get(keyHash);
      if (current && current.resetsAt > now) {
        if (current.count >= limit) return { allowed: false, resetsAt: current.resetsAt };
        current.count += 1;
        return { allowed: true, resetsAt: current.resetsAt };
      }
      // Preserve existing windows: evicting active keys would reset their limits.
      if (!current && attempts.size >= maximumEntries) {
        return { allowed: false, resetsAt: new Date(now.getTime() + 1_000) };
      }
      const resetsAt = new Date(now.getTime() + windowMs);
      attempts.set(keyHash, { count: 1, resetsAt });
      return { allowed: true, resetsAt };
    },
  };
}
