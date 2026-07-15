import { and, eq, sql } from "drizzle-orm";
import { readBody } from "h3";
import db from "../../../../db/client";
import { mobileNotificationPreferences } from "../../../../db/schema";
import {
  accountDeletedError,
  lockActiveMobileUser,
  requireMobileUser,
} from "../../../services/mobile-user";
import { optionalBoolean, optionalQuietHour } from "../../../utils/mobile-validation";

interface PreferenceBody {
  announcementsEnabled?: unknown;
  eventsEnabled?: unknown;
  serverStatusEnabled?: unknown;
  socialEnabled?: unknown;
  rallyEnabled?: unknown;
  weeklyDigestEnabled?: unknown;
  dailyReminderEnabled?: unknown;
  weeklyReminderEnabled?: unknown;
  friendOnlineEnabled?: unknown;
  quietHoursEnabled?: unknown;
  timezoneOffsetMinutes?: unknown;
  onlineVisibility?: unknown;
  quietHoursStart?: unknown;
  quietHoursEnd?: unknown;
}

export default defineEventHandler(async (event) => {
  const { auth } = await requireMobileUser(event);
  const body = await readBody<PreferenceBody>(event);
  const updated = await db.transaction(async (tx) => {
    const user = await lockActiveMobileUser(tx, auth.uid);
    const rows = await tx
      .select()
      .from(mobileNotificationPreferences)
      .where(eq(mobileNotificationPreferences.mobileUserId, user.id))
      .limit(1);
    const existing = rows[0];
    if (!existing) {
      throw createError({ statusCode: 500, statusMessage: "Preferences unavailable" });
    }

    const hasStart = Object.hasOwn(body ?? {}, "quietHoursStart");
    const hasEnd = Object.hasOwn(body ?? {}, "quietHoursEnd");
    const normalizeHour = (value: unknown) => typeof value === "number"
      ? `${String(value).padStart(2, "0")}:00`
      : value;
    const quietHoursStart = hasStart
      ? optionalQuietHour(normalizeHour(body.quietHoursStart), "quietHoursStart")
      : existing.quietHoursStart;
    const quietHoursEnd = hasEnd
      ? optionalQuietHour(normalizeHour(body.quietHoursEnd), "quietHoursEnd")
      : existing.quietHoursEnd;
    if ((quietHoursStart === null) !== (quietHoursEnd === null)) {
      throw createError({
        statusCode: 400,
        statusMessage: "quietHoursStart and quietHoursEnd must both be set or cleared",
      });
    }

    const offset = Object.hasOwn(body ?? {}, "timezoneOffsetMinutes")
      ? Number(body.timezoneOffsetMinutes)
      : existing.timezoneOffsetMinutes;
    if (!Number.isInteger(offset) || offset < -840 || offset > 840) {
      throw createError({ statusCode: 400, statusMessage: "Invalid timezoneOffsetMinutes" });
    }
    const visibility = Object.hasOwn(body ?? {}, "onlineVisibility")
      ? String(body.onlineVisibility)
      : existing.onlineVisibility;
    if (!["friends_and_party", "friends", "hidden"].includes(visibility)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid onlineVisibility" });
    }
    const quietHoursEnabled = optionalBoolean(body?.quietHoursEnabled, "quietHoursEnabled")
      ?? existing.quietHoursEnabled;
    if (quietHoursEnabled && (quietHoursStart === null || quietHoursEnd === null)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Quiet hours require both a start and end",
      });
    }

    const values = {
      announcementsEnabled: optionalBoolean(body?.announcementsEnabled, "announcementsEnabled")
        ?? existing.announcementsEnabled,
      eventsEnabled: optionalBoolean(body?.eventsEnabled, "eventsEnabled") ?? existing.eventsEnabled,
      serverStatusEnabled: optionalBoolean(body?.serverStatusEnabled, "serverStatusEnabled")
        ?? existing.serverStatusEnabled,
      socialEnabled: optionalBoolean(body?.socialEnabled, "socialEnabled") ?? existing.socialEnabled,
      rallyEnabled: optionalBoolean(body?.rallyEnabled, "rallyEnabled") ?? existing.rallyEnabled,
      weeklyDigestEnabled: optionalBoolean(body?.weeklyDigestEnabled, "weeklyDigestEnabled")
        ?? existing.weeklyDigestEnabled,
      dailyReminderEnabled: optionalBoolean(body?.dailyReminderEnabled, "dailyReminderEnabled")
        ?? existing.dailyReminderEnabled,
      weeklyReminderEnabled: optionalBoolean(body?.weeklyReminderEnabled, "weeklyReminderEnabled")
        ?? existing.weeklyReminderEnabled,
      friendOnlineEnabled: optionalBoolean(body?.friendOnlineEnabled, "friendOnlineEnabled")
        ?? existing.friendOnlineEnabled,
      quietHoursEnabled,
      timezoneOffsetMinutes: offset,
      onlineVisibility: visibility,
      quietHoursStart,
      quietHoursEnd,
      updatedAt: new Date(),
    };
    const preferences = await tx
      .update(mobileNotificationPreferences)
      .set(values)
      .where(and(
        eq(mobileNotificationPreferences.mobileUserId, user.id),
        sql`EXISTS (
          SELECT 1 FROM mobile_users
           WHERE id = ${user.id}
             AND deleted_at IS NULL
        )`,
      ))
      .returning();
    if (!preferences.length) throw accountDeletedError();
    return preferences;
  });

  return { data: updated[0] };
});
