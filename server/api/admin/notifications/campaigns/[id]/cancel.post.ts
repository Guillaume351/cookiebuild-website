import { and, eq } from "drizzle-orm";
import { getRouterParam } from "h3";
import db from "../../../../../../db/client";
import {
  adminAuditLog,
  adminNotificationCampaigns,
  mobileNotificationOutbox,
} from "../../../../../../db/schema";
import { adminAuditValues, requireAdminAuth } from "../../../../../utils/admin-auth";
import { adminUuid } from "../../../../../utils/admin-validation";

export default defineEventHandler(async (event) => {
  const auth = requireAdminAuth(event, "notifications:write");
  const id = adminUuid(getRouterParam(event, "id"));
  const [campaign] = await db.select({
    id: adminNotificationCampaigns.id,
    outboxId: adminNotificationCampaigns.outboxId,
    status: adminNotificationCampaigns.status,
  }).from(adminNotificationCampaigns).where(eq(adminNotificationCampaigns.id, id)).limit(1);
  if (!campaign) throw createError({ statusCode: 404, statusMessage: "Campaign not found" });
  if (campaign.status === "cancelled" || !campaign.outboxId) {
    throw createError({ statusCode: 409, statusMessage: "Campaign cannot be cancelled" });
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    const outbox = await tx.update(mobileNotificationOutbox).set({
      status: "dead",
      lastError: "Cancelled by an administrator before delivery",
    }).where(and(
      eq(mobileNotificationOutbox.id, campaign.outboxId!),
      eq(mobileNotificationOutbox.status, "pending"),
    )).returning({ id: mobileNotificationOutbox.id });
    if (!outbox[0]) throw createError({ statusCode: 409, statusMessage: "Campaign is already processing or delivered" });
    await tx.update(adminNotificationCampaigns).set({
      status: "cancelled",
      cancelledAt: now,
      cancelledBy: auth.uid,
    }).where(eq(adminNotificationCampaigns.id, id));
    await tx.insert(adminAuditLog).values(adminAuditValues(
      event,
      "notification.campaign.cancelled",
      "notification_campaign",
      id,
    ));
  });
  return { data: { id, status: "cancelled", cancelledAt: now } };
});
