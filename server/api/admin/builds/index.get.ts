import { createError, getQuery } from "h3";
import { requireAdminAuth } from "../../../utils/admin-auth";
import { adminLimit } from "../../../utils/admin-validation";
import { ADMIN_BUILD_FILTERS, listAdminBuilds, type AdminBuildFilter } from "../../../services/buildbattle-gallery";

/** GET /api/admin/builds?status=reported|hidden|all — Build Battle gallery moderation queue. */
export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "moderation:read");
  const query = getQuery(event);
  const status = typeof query.status === "string" ? query.status : "reported";
  if (!(ADMIN_BUILD_FILTERS as readonly string[]).includes(status)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid build status filter" });
  }
  const limit = adminLimit(query.limit, 100, 200);
  return { data: await listAdminBuilds(status as AdminBuildFilter, limit) };
});
