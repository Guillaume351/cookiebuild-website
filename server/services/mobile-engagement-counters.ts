import { sql } from "drizzle-orm";
import db from "../../db/client";
import { parisDateKey } from "../utils/paris-time";

export type EngagementMetric =
  | "notification_opened"
  | "player_link_claimed"
  | "daily_chest_claimed";

/**
 * Notification kinds the website produces or the admin console can send.
 * Anything else is folded into "other" so clients cannot create unbounded rows.
 */
export const COUNTED_NOTIFICATION_KINDS = new Set([
  "announcement",
  "news",
  "news_published",
  "event",
  "event_reminder",
  "event_start",
  "server_status",
  "server_offline",
  "server_recovered",
  "social",
  "friend_request",
  "party_invite",
  "player_rally",
  "rally",
  "weekly_digest",
  "daily_goal_reminder",
  "weekly_goal_reminder",
  "daily_reminder",
  "weekly_reminder",
  "friend_online",
  "skyblock_market_sold",
  "skyblock_worker_full",
  "skyblock_objective_ready",
  "daily_chest",
]);

export function countedNotificationKind(value: unknown): string {
  if (typeof value !== "string") return "other";
  const normalized = value.trim().toLowerCase();
  return COUNTED_NOTIFICATION_KINDS.has(normalized) ? normalized : "other";
}

function safeKind(kind: string) {
  return /^[a-z0-9_]{1,64}$/.test(kind) ? kind : "other";
}

/** Increments an aggregated Europe/Paris daily counter. Throws on database errors. */
export async function incrementEngagementCounter(
  metric: EngagementMetric,
  kind: string,
  now = new Date(),
) {
  const day = parisDateKey(now);
  await db.execute(sql`
    INSERT INTO mobile_engagement_daily (day, metric, kind, count)
    VALUES (${day}::date, ${metric}, ${safeKind(kind)}, 1)
    ON CONFLICT (day, metric, kind)
    DO UPDATE SET count = mobile_engagement_daily.count + 1, updated_at = now()
  `);
}

/** Best-effort variant for side counters that must never fail the main action. */
export async function recordEngagementCounter(
  metric: EngagementMetric,
  kind: string,
  now = new Date(),
) {
  try {
    await incrementEngagementCounter(metric, kind, now);
  } catch (error) {
    console.warn("[mobile-engagement-counters]", JSON.stringify({
      event: "counter_write_failed",
      metric,
      message: (error instanceof Error ? error.message : String(error))
        .replace(/[\r\n\t]+/g, " ")
        .slice(0, 200),
    }));
  }
}
