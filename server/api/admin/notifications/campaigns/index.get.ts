import { desc, eq } from "drizzle-orm";
import { getQuery } from "h3";
import db from "../../../../../db/client";
import {
  adminNotificationCampaigns,
  adminUsers,
  mobileNotificationOutbox,
} from "../../../../../db/schema";
import { requireAdminAuth } from "../../../../utils/admin-auth";
import { adminLimit } from "../../../../utils/admin-validation";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "notifications:read");
  const limit = adminLimit(getQuery(event).limit, 100, 200);
  const rows = await db.select({
    id: adminNotificationCampaigns.id,
    kind: adminNotificationCampaigns.kind,
    title: adminNotificationCampaigns.title,
    body: adminNotificationCampaigns.body,
    imageUrl: adminNotificationCampaigns.imageUrl,
    deepLink: adminNotificationCampaigns.deepLink,
    audience: adminNotificationCampaigns.audience,
    recipientEstimate: adminNotificationCampaigns.recipientEstimate,
    status: adminNotificationCampaigns.status,
    scheduledAt: adminNotificationCampaigns.scheduledAt,
    createdAt: adminNotificationCampaigns.createdAt,
    cancelledAt: adminNotificationCampaigns.cancelledAt,
    createdBy: adminNotificationCampaigns.createdBy,
    createdByName: adminUsers.displayName,
    outboxStatus: mobileNotificationOutbox.status,
    attempts: mobileNotificationOutbox.attempts,
    deliveredAt: mobileNotificationOutbox.deliveredAt,
    lastError: mobileNotificationOutbox.lastError,
  }).from(adminNotificationCampaigns)
    .innerJoin(adminUsers, eq(adminUsers.firebaseUid, adminNotificationCampaigns.createdBy))
    .leftJoin(mobileNotificationOutbox, eq(mobileNotificationOutbox.id, adminNotificationCampaigns.outboxId))
    .orderBy(desc(adminNotificationCampaigns.createdAt))
    .limit(limit);
  return { data: rows };
});
