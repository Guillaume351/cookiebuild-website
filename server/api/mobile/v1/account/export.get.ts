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
import { mobileCapabilities } from "../../../../services/mobile-capabilities";
import {
  skyblockInventory,
  skyblockInventoryTransferHistory,
  skyblockListings,
  skyblockOverview,
} from "../../../../services/mobile-skyblock";

async function collectCursorPages<T>(
  load: (cursor: string | null) => Promise<{ items: T[]; nextCursor: string | null }>,
) {
  const items: T[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  do {
    const page = await load(cursor);
    items.push(...page.items);
    cursor = page.nextCursor;
    if (cursor && seen.has(cursor)) throw new Error("Repeated Skyblock export cursor");
    if (cursor) seen.add(cursor);
  } while (cursor);
  return items;
}

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
        timezoneOffsetMinutes: mobileDevices.timezoneOffsetMinutes,
        timezoneObservedAt: mobileDevices.timezoneObservedAt,
        notificationsAuthorized: mobileDevices.notificationsAuthorized,
        lastSeenAt: mobileDevices.lastSeenAt,
        createdAt: mobileDevices.createdAt,
        revokedAt: mobileDevices.revokedAt,
      })
      .from(mobileDevices)
      .where(eq(mobileDevices.mobileUserId, user.id)),
  ]);

  let social: Record<string, unknown> = {};
  let skyblock: Record<string, unknown> | null = null;
  if (account?.playerLinks.some((link) => link.isPrimary)) {
    const [friends, blocks, party, friendRequestCooldowns, capabilities] = await Promise.all([
      friendsSnapshot(auth.uid),
      blocksSnapshot(auth.uid),
      partySnapshot(auth.uid),
      friendRequestCooldownsSnapshot(auth.uid),
      mobileCapabilities(),
    ]);
    social = { friends, blocks, party, friendRequestCooldowns };
    if (capabilities.skyblockCompanion) {
      const [overview, inventory, listings, inventoryTransfers] = await Promise.all([
        skyblockOverview(auth.uid, capabilities.skyblockMarketWrites),
        collectCursorPages((cursor) => skyblockInventory(auth.uid, {
          cursor,
          pageSize: 50,
          category: null,
          marketable: null,
        })),
        collectCursorPages((cursor) => skyblockListings(auth.uid, {
          cursor,
          pageSize: 50,
          status: "all",
        })),
        skyblockInventoryTransferHistory(auth.uid),
      ]);
      skyblock = { overview, inventory, listings, inventoryTransfers };
    }
  }

  setHeader(event, "Cache-Control", "no-store");
  return {
    data: {
      exportedAt: new Date().toISOString(),
      account,
      notificationPreferences: preferences ?? null,
      devices,
      social,
      skyblock,
    },
  };
});
