import { and, eq, isNull, sql } from "drizzle-orm";
import { createError } from "h3";
import db from "../../db/client";
import {
  mobileDevices,
  mobileNotificationPreferences,
  mobileUsers,
} from "../../db/schema";

export const ADMIN_NOTIFICATION_KINDS = ["announcement", "event", "server_status", "social"] as const;
export type AdminNotificationKind = typeof ADMIN_NOTIFICATION_KINDS[number];

export interface AdminAudienceSelection {
  scope: "all" | "platform";
  platform?: "ios" | "android";
}

export function parseAdminNotificationKind(value: unknown): AdminNotificationKind {
  if (typeof value !== "string" || !(ADMIN_NOTIFICATION_KINDS as readonly string[]).includes(value)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid notification kind" });
  }
  return value as AdminNotificationKind;
}

export function parseAdminAudience(value: unknown): AdminAudienceSelection {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw createError({ statusCode: 400, statusMessage: "audience is required" });
  }
  const input = value as Record<string, unknown>;
  if (input.scope === "all") return { scope: "all" };
  if (input.scope === "platform" && (input.platform === "ios" || input.platform === "android")) {
    return { scope: "platform", platform: input.platform };
  }
  throw createError({ statusCode: 400, statusMessage: "Invalid notification audience" });
}

function preferenceCondition(kind: AdminNotificationKind) {
  switch (kind) {
    case "announcement": return sql`coalesce(${mobileNotificationPreferences.announcementsEnabled}, true)`;
    case "event": return sql`coalesce(${mobileNotificationPreferences.eventsEnabled}, true)`;
    case "server_status": return sql`coalesce(${mobileNotificationPreferences.serverStatusEnabled}, true)`;
    case "social": return sql`coalesce(${mobileNotificationPreferences.socialEnabled}, true)`;
  }
}

export async function resolveAdminNotificationAudience(
  kind: AdminNotificationKind,
  selection: AdminAudienceSelection,
) {
  const conditions = [
    eq(mobileDevices.notificationsAuthorized, true),
    isNull(mobileDevices.revokedAt),
    isNull(mobileUsers.deletedAt),
    preferenceCondition(kind),
  ];
  if (selection.scope === "platform" && selection.platform) {
    conditions.push(eq(mobileDevices.platform, selection.platform));
  }
  const devices = await db.select({ id: mobileDevices.id })
    .from(mobileDevices)
    .innerJoin(mobileUsers, eq(mobileUsers.id, mobileDevices.mobileUserId))
    .leftJoin(mobileNotificationPreferences, eq(mobileNotificationPreferences.mobileUserId, mobileUsers.id))
    .where(and(...conditions))
    .limit(5_001);
  if (devices.length > 5_000) {
    throw createError({
      statusCode: 409,
      statusMessage: "Audience exceeds 5000 devices and must be segmented",
    });
  }
  return {
    estimate: devices.length,
    outboxAudience: selection.scope === "all"
      ? { all: true as const }
      : { deviceIds: devices.map((device) => device.id) },
  };
}
