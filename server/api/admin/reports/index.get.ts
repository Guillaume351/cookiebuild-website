import { sql } from "drizzle-orm";
import { getQuery } from "h3";
import db from "../../../../db/client";
import { requireAdminAuth } from "../../../utils/admin-auth";
import { adminLimit } from "../../../utils/admin-validation";

interface ReportRow extends Record<string, unknown> {
  id: string;
  reporterPlayerId: string;
  reporterName: string | null;
  reportedPlayerId: string;
  reportedName: string | null;
  reason: string;
  createdAt: Date;
  status: string;
  assignedTo: string | null;
  assignedName: string | null;
  resolutionNote: string | null;
  updatedAt: Date | null;
}

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "reports:read");
  const query = getQuery(event);
  const limit = adminLimit(query.limit, 100, 200);
  const status = typeof query.status === "string" ? query.status : "active";
  if (!["active", "open", "reviewing", "resolved", "dismissed", "all"].includes(status)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid report status" });
  }
  const rows = await db.execute<ReportRow>(sql`
    SELECT report.id,
           report.reporter_player_id AS "reporterPlayerId",
           reporter.name AS "reporterName",
           report.reported_player_id AS "reportedPlayerId",
           reported.name AS "reportedName",
           report.reason,
           report.created_at AS "createdAt",
           coalesce(report_case.status, 'open') AS status,
           report_case.assigned_to AS "assignedTo",
           assigned.display_name AS "assignedName",
           report_case.resolution_note AS "resolutionNote",
           report_case.updated_at AS "updatedAt"
      FROM player_reports report
      JOIN playerdata reporter ON reporter.id = report.reporter_player_id
      JOIN playerdata reported ON reported.id = report.reported_player_id
      LEFT JOIN admin_report_cases report_case ON report_case.report_id = report.id
      LEFT JOIN admin_users assigned ON assigned.firebase_uid = report_case.assigned_to
     WHERE (${status} = 'all')
        OR (${status} = 'active' AND coalesce(report_case.status, 'open') IN ('open', 'reviewing'))
        OR (coalesce(report_case.status, 'open') = ${status})
     ORDER BY CASE WHEN coalesce(report_case.status, 'open') = 'open' THEN 0 ELSE 1 END,
              report.created_at DESC
     LIMIT ${limit}
  `);
  return { data: [...rows] };
});
