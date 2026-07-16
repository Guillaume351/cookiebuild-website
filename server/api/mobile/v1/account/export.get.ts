import { eq } from "drizzle-orm";
import db from "../../../../../db/client";
import {
  mobileDevices,
  mobileNotificationPreferences,
} from "../../../../../db/schema";
import { mobileMe, requireMobileUser } from "../../../../services/mobile-user";
import {
  blocksSnapshot,
  friendRequestCooldownsSnapshot,
  friendsSnapshot,
  partySnapshot,
} from "../../../../services/mobile-social";

export default defineEventHandler(async (event) => {
  const { auth, user } = await requireMobileUser(event);
  const [account, preferences, devices] = await Promise.all([
    mobileMe(auth.uid),
    db.query.mobileNotificationPreferences.findFirst({
      where: eq(mobileNotificationPreferences.mobileUserId, user.id),
    }),
    db
      .select({
        installationId: mobileDevices.installationId,
        platform: mobileDevices.platform,
        fcmToken: mobileDevices.fcmToken,
        appVersion: mobileDevices.appVersion,
        locale: mobileDevices.locale,
        timezone: mobileDevices.timezone,
        notificationsAuthorized: mobileDevices.notificationsAuthorized,
        lastSeenAt: mobileDevices.lastSeenAt,
        createdAt: mobileDevices.createdAt,
        revokedAt: mobileDevices.revokedAt,
      })
      .from(mobileDevices)
      .where(eq(mobileDevices.mobileUserId, user.id)),
  ]);

  let social: Record<string, unknown> = {};
  if (account?.playerLinks.some((link) => link.isPrimary)) {
    const [friends, blocks, party, friendRequestCooldowns] = await Promise.all([
      friendsSnapshot(auth.uid),
      blocksSnapshot(auth.uid),
      partySnapshot(auth.uid),
      friendRequestCooldownsSnapshot(auth.uid),
    ]);
    social = { friends, blocks, party, friendRequestCooldowns };
  }

  setHeader(event, "Cache-Control", "no-store");
  return {
    data: {
      exportedAt: new Date().toISOString(),
      account,
      notificationPreferences: preferences ?? null,
      devices,
      social,
    },
  };
});
