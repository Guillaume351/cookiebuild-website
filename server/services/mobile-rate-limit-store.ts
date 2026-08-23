import { sql } from "drizzle-orm";
import db from "../../db/client";
import type { MobileRateLimitStore } from "../utils/mobile-rate-limit";

export const postgresMobileRateLimitStore: MobileRateLimitStore = {
  async consume({ keyHash, limit, windowMs, now }) {
    const resetsAt = new Date(now.getTime() + windowMs);
    const nowIso = now.toISOString();
    const resetsAtIso = resetsAt.toISOString();
    const rows = await db.execute<{ count: number; resetsAt: Date | string } & Record<string, unknown>>(sql`
      INSERT INTO mobile_rate_limits (key_hash, request_count, resets_at, updated_at)
      VALUES (${keyHash}, 1, ${resetsAtIso}, ${nowIso})
      ON CONFLICT (key_hash) DO UPDATE
        SET request_count = CASE
              WHEN mobile_rate_limits.resets_at <= ${nowIso} THEN 1
              ELSE LEAST(mobile_rate_limits.request_count + 1, ${limit + 1})
            END,
            resets_at = CASE
              WHEN mobile_rate_limits.resets_at <= ${nowIso} THEN ${resetsAtIso}
              ELSE mobile_rate_limits.resets_at
            END,
            updated_at = ${nowIso}
      RETURNING request_count AS "count", resets_at AS "resetsAt"
    `);
    const result = rows[0];
    if (!result) throw new Error("Mobile rate limit row was not returned");
    return {
      allowed: Number(result.count) <= limit,
      resetsAt: new Date(result.resetsAt),
    };
  },
};
