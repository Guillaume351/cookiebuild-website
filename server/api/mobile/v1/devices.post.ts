import { and, eq, isNull, ne } from "drizzle-orm";
import { readBody } from "h3";
import db from "../../../../db/client";
import { mobileDevices, mobileUsers } from "../../../../db/schema";
import {
  accountDeletedError,
  lockActiveMobileUser,
  requireMobileUser,
} from "../../../services/mobile-user";
import { optionalString, requiredString } from "../../../utils/mobile-validation";

interface DeviceBody {
  installationId?: unknown;
  platform?: unknown;
  fcmToken?: unknown;
  appVersion?: unknown;
  locale?: unknown;
  timezone?: unknown;
  notificationsAuthorized?: unknown;
}

export default defineEventHandler(async (event) => {
  const { auth } = await requireMobileUser(event);
  const body = await readBody<DeviceBody>(event);
  const installationId = requiredString(body?.installationId, "installationId", {
    minimum: 8,
    maximum: 128,
  });
  const platform = requiredString(body?.platform, "platform", { maximum: 16 }).toLowerCase();
  if (platform !== "ios" && platform !== "android") {
    throw createError({ statusCode: 400, statusMessage: "Invalid platform" });
  }
  const fcmToken = requiredString(body?.fcmToken, "fcmToken", { minimum: 20, maximum: 4096 });
  const appVersion = optionalString(body?.appVersion, "appVersion", 32);
  const locale = optionalString(body?.locale, "locale", 16);
  const timezone = optionalString(body?.timezone, "timezone", 64);
  if (typeof body?.notificationsAuthorized !== "boolean") {
    throw createError({ statusCode: 400, statusMessage: "Invalid notificationsAuthorized" });
  }
  const notificationsAuthorized = body.notificationsAuthorized;

  const device = await db.transaction(async (tx) => {
    const user = await lockActiveMobileUser(tx, auth.uid);
    await tx
      .delete(mobileDevices)
      .where(and(eq(mobileDevices.fcmToken, fcmToken), ne(mobileDevices.installationId, installationId)));
    const rows = await tx
      .insert(mobileDevices)
      .values({
        mobileUserId: user.id,
        installationId,
        platform,
        fcmToken,
        appVersion,
        locale,
        timezone,
        notificationsAuthorized,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: mobileDevices.installationId,
        set: {
          mobileUserId: user.id,
          platform,
          fcmToken,
          appVersion,
          locale,
          timezone,
          notificationsAuthorized,
          lastSeenAt: new Date(),
          revokedAt: null,
        },
      })
      .returning({
        id: mobileDevices.id,
        installationId: mobileDevices.installationId,
        platform: mobileDevices.platform,
        notificationsAuthorized: mobileDevices.notificationsAuthorized,
        lastSeenAt: mobileDevices.lastSeenAt,
      });

    const updatedUsers = await tx
      .update(mobileUsers)
      .set({
        locale: locale ?? user.locale,
        timezone: timezone ?? user.timezone,
        updatedAt: new Date(),
      })
      .where(and(eq(mobileUsers.id, user.id), isNull(mobileUsers.deletedAt)))
      .returning({ id: mobileUsers.id });
    if (!updatedUsers.length) throw accountDeletedError();
    return rows[0];
  });

  return { data: device };
});
