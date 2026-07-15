import { desc } from "drizzle-orm";
import { getQuery } from "h3";
import db from "../../../../db/client";
import { mobileNotificationOutbox } from "../../../../db/schema";
import { requireAdminAuth } from "../../../utils/admin-auth";
import { adminLimit } from "../../../utils/admin-validation";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "notifications:read");
  const limit = adminLimit(getQuery(event).limit, 100, 200);
  const rows = await db.select({
    id: mobileNotificationOutbox.id,
    kind: mobileNotificationOutbox.kind,
    status: mobileNotificationOutbox.status,
    attempts: mobileNotificationOutbox.attempts,
    availableAt: mobileNotificationOutbox.availableAt,
    deliveredAt: mobileNotificationOutbox.deliveredAt,
    lastError: mobileNotificationOutbox.lastError,
    createdAt: mobileNotificationOutbox.createdAt,
  }).from(mobileNotificationOutbox)
    .orderBy(desc(mobileNotificationOutbox.createdAt))
    .limit(limit);
  return { data: rows };
});
