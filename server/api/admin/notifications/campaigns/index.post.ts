import { randomUUID } from "node:crypto";
import { readBody } from "h3";
import db from "../../../../../db/client";
import {
  adminAuditLog,
  adminNotificationCampaigns,
  mobileNotificationOutbox,
} from "../../../../../db/schema";
import { adminAuditValues, requireAdminAuth } from "../../../../utils/admin-auth";
import { adminDate, adminText } from "../../../../utils/admin-validation";
import { parseNotificationPayload, PermanentOutboxError } from "../../../../utils/mobile-notification";
import {
  parseAdminAudience,
  parseAdminNotificationKind,
  resolveAdminNotificationAudience,
} from "../../../../services/admin-notifications";

export default defineEventHandler(async (event) => {
  const auth = requireAdminAuth(event, "notifications:write");
  const body = await readBody<Record<string, unknown>>(event);
  const kind = parseAdminNotificationKind(body.kind);
  const audience = parseAdminAudience(body.audience);
  const resolved = await resolveAdminNotificationAudience(kind, audience);
  const title = adminText(body.title, "title", 120)!;
  const notificationBody = adminText(body.body, "body", 500, false);
  const imageUrl = adminText(body.imageUrl, "imageUrl", 2048, false);
  const deepLink = adminText(body.deepLink, "deepLink", 2048, false);
  let scheduledAt = adminDate(body.scheduledAt, "scheduledAt") || new Date();
  const now = new Date();
  if (scheduledAt < now) scheduledAt = now;
  if (scheduledAt.getTime() > now.getTime() + (30 * 24 * 60 * 60_000)) {
    throw createError({ statusCode: 400, statusMessage: "Notifications can be scheduled at most 30 days ahead" });
  }
  const campaignId = randomUUID();
  const outboxId = randomUUID();
  let payload;
  try {
    payload = parseNotificationPayload({
      title,
      body: notificationBody || undefined,
      imageUrl: imageUrl || undefined,
      deepLink: deepLink || undefined,
      urgent: body.urgent === true,
      data: { type: "admin_campaign", campaignId },
    }, kind);
  } catch (error) {
    if (error instanceof PermanentOutboxError) {
      throw createError({ statusCode: 400, statusMessage: error.message });
    }
    throw error;
  }
  const campaignStatus = scheduledAt.getTime() > now.getTime() + 60_000 ? "scheduled" : "queued";
  const [created] = await db.transaction(async (tx) => {
    await tx.insert(mobileNotificationOutbox).values({
      id: outboxId,
      kind,
      dedupeKey: `admin-campaign-${campaignId}`,
      audience: resolved.outboxAudience,
      payload,
      availableAt: scheduledAt,
    });
    const rows = await tx.insert(adminNotificationCampaigns).values({
      id: campaignId,
      createdBy: auth.uid,
      kind,
      title,
      body: notificationBody,
      imageUrl,
      deepLink,
      audience: { ...audience },
      recipientEstimate: resolved.estimate,
      status: campaignStatus,
      scheduledAt,
      outboxId,
    }).returning();
    await tx.insert(adminAuditLog).values(adminAuditValues(
      event,
      "notification.campaign.created",
      "notification_campaign",
      campaignId,
      { kind, audience, recipientEstimate: resolved.estimate, scheduledAt: scheduledAt.toISOString() },
    ));
    return rows;
  });
  setResponseStatus(event, 201);
  return { data: created };
});
