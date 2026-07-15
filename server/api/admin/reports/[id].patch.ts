import { eq } from "drizzle-orm";
import { getRouterParam, readBody } from "h3";
import db from "../../../../db/client";
import { adminAuditLog, adminReportCases, playerReports } from "../../../../db/schema";
import { adminAuditValues, requireAdminAuth } from "../../../utils/admin-auth";
import { adminText, adminUuid } from "../../../utils/admin-validation";

const STATUSES = ["open", "reviewing", "resolved", "dismissed"] as const;

export default defineEventHandler(async (event) => {
  const auth = requireAdminAuth(event, "reports:write");
  const reportId = adminUuid(getRouterParam(event, "id"), "report id");
  const body = await readBody<{ status?: unknown; assignedTo?: unknown; resolutionNote?: unknown }>(event);
  if (typeof body.status !== "string" || !(STATUSES as readonly string[]).includes(body.status)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid report status" });
  }
  const status = body.status as typeof STATUSES[number];
  const resolutionNote = adminText(body.resolutionNote, "resolutionNote", 2_000, false);
  if (["resolved", "dismissed"].includes(status) && !resolutionNote) {
    throw createError({ statusCode: 400, statusMessage: "A resolution note is required" });
  }
  const assignedTo = body.assignedTo === "me" ? auth.uid : null;
  const [report] = await db.select({ id: playerReports.id }).from(playerReports)
    .where(eq(playerReports.id, reportId)).limit(1);
  if (!report) throw createError({ statusCode: 404, statusMessage: "Report not found" });

  const now = new Date();
  const [updated] = await db.transaction(async (tx) => {
    const rows = await tx.insert(adminReportCases).values({
      reportId,
      status,
      assignedTo,
      resolutionNote,
      updatedBy: auth.uid,
      resolvedAt: ["resolved", "dismissed"].includes(status) ? now : null,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: adminReportCases.reportId,
      set: {
        status,
        assignedTo,
        resolutionNote,
        updatedBy: auth.uid,
        resolvedAt: ["resolved", "dismissed"].includes(status) ? now : null,
        updatedAt: now,
      },
    }).returning();
    await tx.insert(adminAuditLog).values(adminAuditValues(
      event,
      "report.updated",
      "player_report",
      reportId,
      { status, assignedTo, hasResolutionNote: Boolean(resolutionNote) },
    ));
    return rows;
  });
  return { data: updated };
});
