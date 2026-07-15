import { sql } from "drizzle-orm";
import db from "../../../db/client";
import { requireAdminAuth } from "../../utils/admin-auth";

interface CountRow extends Record<string, unknown> { value: number | string }

async function count(query: ReturnType<typeof sql>) {
  const rows = await db.execute<CountRow>(query);
  return Number(rows[0]?.value || 0);
}

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "dashboard:read");
  const [
    onlinePlayers,
    openMatches,
    players24h,
    matches24h,
    openReports,
    enabledDevices,
    pendingNotifications,
    deadNotifications,
    publishedContent,
  ] = await Promise.all([
    count(sql`SELECT count(DISTINCT player_id) AS value FROM player_sessions WHERE end_time IS NULL`),
    count(sql`SELECT count(*) AS value FROM matches WHERE endtime IS NULL`),
    count(sql`SELECT count(DISTINCT player_id) AS value FROM player_sessions WHERE start_time >= now() - interval '24 hours'`),
    count(sql`SELECT count(*) AS value FROM matches WHERE starttime >= now() - interval '24 hours'`),
    count(sql`
      SELECT count(*) AS value
        FROM player_reports report
        LEFT JOIN admin_report_cases report_case ON report_case.report_id = report.id
       WHERE coalesce(report_case.status, 'open') IN ('open', 'reviewing')
    `),
    count(sql`
      SELECT count(*) AS value
        FROM mobile_devices
       WHERE notifications_authorized = true AND revoked_at IS NULL
    `),
    count(sql`SELECT count(*) AS value FROM mobile_notification_outbox WHERE status IN ('pending', 'processing')`),
    count(sql`SELECT count(*) AS value FROM mobile_notification_outbox WHERE status = 'dead'`),
    count(sql`SELECT count(*) AS value FROM mobile_news_posts WHERE status = 'published'`),
  ]);

  setHeader(event, "Cache-Control", "no-store");
  return { data: {
    generatedAt: new Date().toISOString(),
    players: { online: onlinePlayers, unique24h: players24h },
    matches: { open: openMatches, started24h: matches24h },
    moderation: { openReports },
    notifications: { enabledDevices, pending: pendingNotifications, dead: deadNotifications },
    content: { published: publishedContent },
  } };
});
