import { sql } from "drizzle-orm";
import db from "../../../db/client";
import { requireAdminAuth } from "../../utils/admin-auth";

interface AnalyticsSummary extends Record<string, unknown> {
  active24h: number;
  active7d: number;
  new7d: number;
  matches24h: number;
  matches7d: number;
  sessionP50Minutes: number;
  sessionP90Minutes: number;
}

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "dashboard:read");
  try {
    const [summaryRows, usageHourly, matchesHourly] = await Promise.all([
      db.execute<AnalyticsSummary>(sql`
        SELECT active_24h AS "active24h",
               active_7d AS "active7d",
               new_7d AS "new7d",
               matches_24h AS "matches24h",
               matches_7d AS "matches7d",
               session_p50_minutes AS "sessionP50Minutes",
               session_p90_minutes AS "sessionP90Minutes"
          FROM metrics.usage_summary
         LIMIT 1
      `),
      db.execute(sql`
        SELECT time, active_players AS "activePlayers", sessions
          FROM metrics.usage_hourly
         WHERE time >= now() - interval '24 hours'
         ORDER BY time
         LIMIT 1000
      `),
      db.execute(sql`
        SELECT time, gametype AS "gameType", completed_matches AS "completedMatches"
          FROM metrics.matches_hourly
         WHERE time >= now() - interval '24 hours'
         ORDER BY time
         LIMIT 2000
      `),
    ]);
    setHeader(event, "Cache-Control", "no-store");
    return { data: {
      available: true,
      summary: summaryRows[0] || null,
      usageHourly: [...usageHourly],
      matchesHourly: [...matchesHourly],
    } };
  } catch {
    setHeader(event, "Cache-Control", "no-store");
    return { data: { available: false, summary: null, usageHourly: [], matchesHourly: [] } };
  }
});
