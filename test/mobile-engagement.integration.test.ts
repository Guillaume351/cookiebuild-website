import { afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

const enabled = process.env.COOKIEBUILD_MOBILE_INTEGRATION === "1";

describe.skipIf(!enabled)("mobile engagement PostgreSQL integration", () => {
  it("runs the idempotent notification producer against PostgreSQL", async () => {
    const { enqueueMobileEngagementNotifications } = await import(
      "../server/services/mobile-engagement-notifications"
    );
    const result = await enqueueMobileEngagementNotifications();
    expect(result).toEqual({
      daily: expect.any(Number),
      weekly: expect.any(Number),
      friendOnline: expect.any(Number),
    });
  });

  it("loads a linked player's personal rank, goals, and privacy-scoped presence", async () => {
    const { default: db } = await import("../db/client");
    const players = await db.execute<{ playerId: string }>(sql`
      SELECT id AS "playerId" FROM playerdata ORDER BY id LIMIT 1
    `);
    const playerId = players[0]?.playerId;
    expect(playerId).toBeTruthy();
    if (!playerId) throw new Error("Integration player fixture is missing");
    const firebaseUid = `integration-engagement-${Date.now()}`;
    await db.execute(sql`
      INSERT INTO mobile_users (firebase_uid) VALUES (${firebaseUid})
    `);
    await db.execute(sql`
      INSERT INTO mobile_notification_preferences (mobile_user_id)
      SELECT id FROM mobile_users WHERE firebase_uid = ${firebaseUid}
    `);
    await db.execute(sql`
      INSERT INTO mobile_player_links (firebase_uid, player_id, edition, is_primary)
      VALUES (${firebaseUid}, ${playerId}, 'java', true)
    `);
    try {
      const { mobileEngagementSnapshot, mobilePresenceSnapshot } = await import(
        "../server/services/mobile-engagement"
      );
      const profile = await mobileEngagementSnapshot(firebaseUid, new Date("2026-07-15T12:00:00Z"));
      expect(profile).toMatchObject({
        playerId,
        edition: "java",
        rank: { period: "season", gamemode: "all" },
        progression: { resetTimezone: "UTC" },
      });
      expect(profile.progression.dailyQuests).toHaveLength(2);
      expect(profile.progression.weeklyQuests).toHaveLength(3);
      await expect(mobilePresenceSnapshot(firebaseUid)).resolves.toEqual({
        friends: [],
        partyMembers: [],
      });
      const { friendsSnapshot, partySnapshot } = await import("../server/services/mobile-social");
      await expect(friendsSnapshot(firebaseUid)).resolves.toMatchObject({ friends: [] });
      await expect(partySnapshot(firebaseUid)).resolves.toEqual({
        party: null,
        incomingInvites: [],
      });
    } finally {
      await db.execute(sql`DELETE FROM mobile_player_links WHERE firebase_uid = ${firebaseUid}`);
      await db.execute(sql`DELETE FROM mobile_users WHERE firebase_uid = ${firebaseUid}`);
    }
  });

  afterAll(async () => {
    if (!enabled) return;
    const { postgresClient } = await import("../db/client");
    await postgresClient.end({ timeout: 0 });
  });
});
