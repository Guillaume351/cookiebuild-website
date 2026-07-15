import { and, desc, eq, lt } from "drizzle-orm";
import { getQuery } from "h3";
import db from "../../../db/client";
import { adminAuditLog, adminUsers } from "../../../db/schema";
import { requireAdminAuth } from "../../utils/admin-auth";
import { adminDate, adminLimit } from "../../utils/admin-validation";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "audit:read");
  const query = getQuery(event);
  const limit = adminLimit(query.limit, 100, 200);
  const before = adminDate(query.before, "before");
  const actor = typeof query.actor === "string" ? query.actor.slice(0, 128) : null;
  const filters = [];
  if (before) filters.push(lt(adminAuditLog.createdAt, before));
  if (actor) filters.push(eq(adminAuditLog.actorUid, actor));
  const rows = await db.select({
    id: adminAuditLog.id,
    actorUid: adminAuditLog.actorUid,
    actorEmail: adminUsers.email,
    actorDisplayName: adminUsers.displayName,
    actorRole: adminAuditLog.actorRole,
    action: adminAuditLog.action,
    resourceType: adminAuditLog.resourceType,
    resourceId: adminAuditLog.resourceId,
    requestId: adminAuditLog.requestId,
    metadata: adminAuditLog.metadata,
    createdAt: adminAuditLog.createdAt,
  }).from(adminAuditLog)
    .innerJoin(adminUsers, eq(adminUsers.firebaseUid, adminAuditLog.actorUid))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);
  return { data: rows };
});
