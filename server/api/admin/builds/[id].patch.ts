import { createError, getRouterParam, readBody } from "h3";
import { adminAuditValues, requireAdminAuth } from "../../../utils/admin-auth";
import { adminText, adminUuid } from "../../../utils/admin-validation";
import { moderateBuild } from "../../../services/buildbattle-gallery";

/** PATCH /api/admin/builds/<id> { action: "hide" | "restore", note? } — audited. */
export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "moderation:write");
  const id = adminUuid(getRouterParam(event, "id"), "build id");
  const body = await readBody<{ action?: unknown; note?: unknown }>(event);
  if (body?.action !== "hide" && body?.action !== "restore") {
    throw createError({ statusCode: 400, statusMessage: "Invalid moderation action" });
  }
  const action = body.action;
  const note = adminText(body.note, "note", 500, false);
  const result = await moderateBuild(id, action, (status) => adminAuditValues(
    event,
    action === "hide" ? "buildbattle_build.hidden" : "buildbattle_build.restored",
    "buildbattle_build",
    id,
    { status, hasNote: Boolean(note), ...(note ? { note } : {}) },
  ));
  return { data: result };
});
