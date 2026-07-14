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
  weeklyDigestEnabled?: unknown;
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
    const quietHoursStart = hasStart
      ? optionalQuietHour(body.quietHoursStart, "quietHoursStart")
      : existing.quietHoursStart;
    const quietHoursEnd = hasEnd
      ? optionalQuietHour(body.quietHoursEnd, "quietHoursEnd")
      : existing.quietHoursEnd;
    if ((quietHoursStart === null) !== (quietHoursEnd === null)) {
      throw createError({
        statusCode: 400,
        statusMessage: "quietHoursStart and quietHoursEnd must both be set or cleared",
      });
    }

    const values = {
      announcementsEnabled: optionalBoolean(body?.announcementsEnabled, "announcementsEnabled")
        ?? existing.announcementsEnabled,
      eventsEnabled: optionalBoolean(body?.eventsEnabled, "eventsEnabled") ?? existing.eventsEnabled,
      serverStatusEnabled: optionalBoolean(body?.serverStatusEnabled, "serverStatusEnabled")
        ?? existing.serverStatusEnabled,
      socialEnabled: optionalBoolean(body?.socialEnabled, "socialEnabled") ?? existing.socialEnabled,
      weeklyDigestEnabled: optionalBoolean(body?.weeklyDigestEnabled, "weeklyDigestEnabled")
        ?? existing.weeklyDigestEnabled,
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
