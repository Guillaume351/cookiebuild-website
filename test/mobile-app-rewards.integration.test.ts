import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

const enabled = process.env.COOKIEBUILD_MOBILE_INTEGRATION === "1";
const PEPPER = "integration-pepper-0123456789abcdefghijklmnop";

describe.skipIf(!enabled)("app rewards and engagement PostgreSQL integration", () => {
  let db: typeof import("../db/client")["default"];
  const suffix = randomUUID().slice(0, 8);
  const playerId = randomUUID();
  const firebaseUid = `integration-rewards-${suffix}`;
  let mobileUserId = "";

  beforeAll(async () => {
    process.env.MOBILE_LINK_PEPPER = PEPPER;
    db = (await import("../db/client")).default;
    await db.execute(sql`INSERT INTO playerdata (id, name, coins) VALUES (${playerId}, ${`Reward_${suffix}`}, 0)`);
    const users = await db.execute<{ id: string }>(sql`
      INSERT INTO mobile_users (firebase_uid, locale) VALUES (${firebaseUid}, 'fr-FR') RETURNING id
    `);
    mobileUserId = users[0]!.id;
    await db.execute(sql`INSERT INTO mobile_notification_preferences (mobile_user_id) VALUES (${mobileUserId})`);
    await db.execute(sql`
      INSERT INTO mobile_devices (mobile_user_id, installation_id, platform, fcm_token, notifications_authorized)
      VALUES (${mobileUserId}, ${`install-${suffix}`}, 'android', ${`token-${suffix}`}, true)
    `);
  });

  afterAll(async () => {
    if (!enabled) return;
    await db.execute(sql`DELETE FROM mobile_notification_outbox WHERE dedupe_key LIKE ${`%${mobileUserId}%`} OR audience::text LIKE ${`%${mobileUserId}%`}`);
    await db.execute(sql`DELETE FROM mobile_events WHERE slug LIKE ${`soiree-cookie-it-${suffix}%`}`);
    await db.execute(sql`DELETE FROM mobile_player_links WHERE firebase_uid = ${firebaseUid}`);
    await db.execute(sql`DELETE FROM mobile_users WHERE firebase_uid = ${firebaseUid}`);
    await db.execute(sql`DELETE FROM playerdata WHERE id = ${playerId}`);
    const { postgresClient } = await import("../db/client");
    await postgresClient.end({ timeout: 0 });
  });

  it("links a player and grants 150 coins plus the companion badge exactly once", async () => {
    const { linkCodeHmac } = await import("../server/utils/mobile-validation");
    const { claimPlayerLink, revokePlayerLinks } = await import("../server/services/mobile-player-link");
    const challenge = async (code: string) => db.execute(sql`
      INSERT INTO player_link_challenges (player_id, edition, purpose, code_hmac, expires_at)
      VALUES (${playerId}, 'java', 'mobile_link', ${linkCodeHmac(code, PEPPER)}, now() + interval '10 minutes')
    `);
    await challenge("AB23CD45");
    const first = await claimPlayerLink(firebaseUid, "AB23CD45");
    expect(first).toMatchObject({ playerId, edition: "java", reward: { coins: 150, cosmeticId: "app_companion_badge" } });

    await revokePlayerLinks(firebaseUid, { playerId });
    await challenge("EF67GH89");
    const again = await claimPlayerLink(firebaseUid, "EF67GH89");
    expect(again.reward).toBeNull();

    const grants = await db.execute<{ coins: number; cosmetic: string | null }>(sql`
      SELECT coins, cosmetic_id AS cosmetic FROM player_reward_grants
       WHERE player_uuid = ${playerId} AND source = 'app_link' AND period_key = 'once' AND delivered_at IS NULL
    `);
    expect([...grants]).toEqual([{ coins: 150, cosmetic: "app_companion_badge" }]);
  });

  it("runs the Paris-day chest streak with conflicts and resets", async () => {
    const { claimDailyChest, dailyChestStatus } = await import("../server/services/mobile-rewards");
    const day1 = new Date("2031-03-05T10:00:00Z");
    await expect(dailyChestStatus(firebaseUid, day1)).resolves.toMatchObject({
      linked: true, available: true, claimedToday: false, streak: 0, currentDay: 1,
      nextResetAt: "2031-03-05T23:00:00.000Z",
    });
    await expect(claimDailyChest(firebaseUid, day1)).resolves.toMatchObject({ granted: { coins: 25, day: 1 }, streak: 1 });
    await expect(claimDailyChest(firebaseUid, day1)).rejects.toMatchObject({ statusCode: 409 });
    await expect(dailyChestStatus(firebaseUid, day1)).resolves.toMatchObject({ available: false, claimedToday: true, streak: 1 });

    // 23:30 UTC is already the next Paris day.
    const day2 = new Date("2031-03-05T23:30:00Z");
    await expect(claimDailyChest(firebaseUid, day2)).resolves.toMatchObject({ granted: { coins: 30, day: 2 }, streak: 2 });
    const day4 = new Date("2031-03-08T12:00:00Z");
    await expect(dailyChestStatus(firebaseUid, day4)).resolves.toMatchObject({ streak: 0, currentDay: 1 });
    await expect(claimDailyChest(firebaseUid, day4)).resolves.toMatchObject({ granted: { coins: 25, day: 1 }, streak: 1 });

    const grants = await db.execute<{ periodKey: string; coins: number }>(sql`
      SELECT period_key AS "periodKey", coins FROM player_reward_grants
       WHERE player_uuid = ${playerId} AND source = 'app_daily' ORDER BY period_key
    `);
    expect([...grants]).toEqual([
      { periodKey: "2031-03-05", coins: 25 },
      { periodKey: "2031-03-06", coins: 30 },
      { periodKey: "2031-03-08", coins: 25 },
    ]);
    await expect(claimDailyChest("integration-unlinked-user", day4)).rejects.toMatchObject({ statusCode: 410 });
  });

  it("aggregates engagement counters without identity", async () => {
    const { incrementEngagementCounter } = await import("../server/services/mobile-engagement-counters");
    const at = new Date("2031-03-05T12:00:00Z");
    await incrementEngagementCounter("notification_opened", `it_${suffix}`, at);
    await incrementEngagementCounter("notification_opened", `it_${suffix}`, at);
    const rows = await db.execute<{ count: string }>(sql`
      SELECT count FROM mobile_engagement_daily
       WHERE day = '2031-03-05' AND metric = 'notification_opened' AND kind = ${`it_${suffix}`}
    `);
    expect(Number(rows[0]!.count)).toBe(2);
    await db.execute(sql`DELETE FROM mobile_engagement_daily WHERE kind = ${`it_${suffix}`}`);
  });

  it("schedules Soirée Cookie idempotently and queues one localized reminder per occurrence", async () => {
    const events = await import("../server/services/mobile-community-events");
    await events.ensureSoireeCookieEvents();
    await expect(events.ensureSoireeCookieEvents()).resolves.toBe(0);
    const listed = await db.execute<{ localizations: Record<string, { title: string }> }>(sql`
      SELECT localizations FROM mobile_events WHERE slug LIKE 'soiree-cookie-%' ORDER BY starts_at LIMIT 1
    `);
    expect(listed[0]!.localizations.fr!.title).toContain("Soirée Cookie");

    const slug = `soiree-cookie-it-${suffix}`;
    await db.execute(sql`
      INSERT INTO mobile_events (slug, title, description, starts_at, ends_at, status)
      VALUES (${slug}, 'Soirée Cookie', 'Test', now() + interval '10 minutes', now() + interval '70 minutes', 'scheduled')
    `);
    expect(await events.enqueueSoireeCookieReminders()).toBeGreaterThanOrEqual(1);
    await expect(events.enqueueSoireeCookieReminders()).resolves.toBe(0);
    const queued = await db.execute<{ kind: string; audience: unknown; payload: unknown }>(sql`
      SELECT kind, audience, payload FROM mobile_notification_outbox
       WHERE dedupe_key LIKE ${`soiree-reminder:${slug}:%`} AND audience::text LIKE ${`%${mobileUserId}%`}
    `);
    expect(queued).toHaveLength(1);
    const { parseNotificationAudience, parseNotificationPayloadForKind, preferenceKind } = await import("../server/utils/mobile-notification");
    expect(preferenceKind(queued[0]!.kind)).toBe("event");
    expect(parseNotificationAudience(queued[0]!.audience, queued[0]!.kind).mobileUserIds).toContain(mobileUserId);
    const payload = parseNotificationPayloadForKind(queued[0]!.payload, queued[0]!.kind);
    expect(payload.title).toBe("🍪 La Soirée Cookie commence dans 15 minutes");
    expect(payload.deepLink).toMatch(/^cookiebuild:\/\/events\//);
    await db.execute(sql`DELETE FROM mobile_notification_outbox WHERE dedupe_key LIKE ${`soiree-reminder:${slug}:%`}`);
  });

  it("queues the Monday weekly digest once with last week's matches", async () => {
    process.env.MOBILE_SOIREE_COOKIE_ENABLED = "true";
    const { enqueueWeeklyDigestNotifications } = await import("../server/services/mobile-engagement-notifications");
    const monday = new Date("2031-03-10T09:30:00Z"); // 10:30 Paris (CET)
    expect(await enqueueWeeklyDigestNotifications(monday)).toBeGreaterThanOrEqual(1);
    await expect(enqueueWeeklyDigestNotifications(monday)).resolves.toBe(0);
    const rows = await db.execute<{ payload: unknown }>(sql`
      SELECT payload FROM mobile_notification_outbox WHERE dedupe_key = ${`weekly-digest:${mobileUserId}:2031-W10`}
    `);
    const { parseNotificationPayloadForKind } = await import("../server/utils/mobile-notification");
    const payload = parseNotificationPayloadForKind(rows[0]!.payload, "weekly_digest");
    expect(payload.title).toBe("Ta semaine sur Cookie Build");
    expect(payload.body).toContain("Pas de partie la semaine dernière");
    expect(payload.body).toContain("mercredi à 21 h");
    expect(payload.data).toMatchObject({ type: "weekly_digest", week: "2031-W10", matches: "0" });
    delete process.env.MOBILE_SOIREE_COOKIE_ENABLED;
  });

  it("moves only never-saved preference rows to the new defaults when the migration re-runs", async () => {
    const saved = await db.execute<{ id: string }>(sql`
      INSERT INTO mobile_users (firebase_uid) VALUES (${`${firebaseUid}-saved`}) RETURNING id
    `);
    const untouched = await db.execute<{ id: string }>(sql`
      INSERT INTO mobile_users (firebase_uid) VALUES (${`${firebaseUid}-untouched`}) RETURNING id
    `);
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`
          INSERT INTO mobile_notification_preferences (mobile_user_id, rally_enabled, friend_online_enabled, daily_reminder_enabled, updated_at)
          SELECT id, false, false, false, created_at FROM mobile_users WHERE id = ${untouched[0]!.id}
        `);
        await tx.execute(sql`
          INSERT INTO mobile_notification_preferences (mobile_user_id, rally_enabled, friend_online_enabled, daily_reminder_enabled, updated_at)
          VALUES (${saved[0]!.id}, false, false, false, now() + interval '1 minute')
        `);
      });
      const migration = await readFile(new URL("../drizzle/0020_app_rewards_engagement.sql", import.meta.url), "utf8");
      const { postgresClient } = await import("../db/client");
      await postgresClient.begin((tx) => tx.unsafe(migration));
      const rows = await db.execute<{ id: string; rally: boolean; friend: boolean; daily: boolean; saved: boolean }>(sql`
        SELECT mobile_user_id AS id, rally_enabled AS rally, friend_online_enabled AS friend,
               daily_reminder_enabled AS daily, explicitly_saved_at IS NOT NULL AS saved
          FROM mobile_notification_preferences
         WHERE mobile_user_id IN (${saved[0]!.id}, ${untouched[0]!.id})
      `);
      const byId = new Map(rows.map((row) => [row.id, row]));
      expect(byId.get(untouched[0]!.id)).toMatchObject({ rally: true, friend: true, daily: true, saved: false });
      expect(byId.get(saved[0]!.id)).toMatchObject({ rally: false, friend: false, daily: false, saved: true });
    } finally {
      await db.execute(sql`DELETE FROM mobile_users WHERE firebase_uid IN (${`${firebaseUid}-saved`}, ${`${firebaseUid}-untouched`})`);
    }
  });
});
