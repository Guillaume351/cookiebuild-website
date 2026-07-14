import { readFile } from "node:fs/promises";
import type { H3Event } from "h3";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const firebaseMessaging = vi.hoisted(() => ({
  sendEachForMulticast: vi.fn(async (message: { tokens: string[] }) => ({
    responses: message.tokens.map(() => ({ success: true })),
  })),
}));
const h3Mocks = vi.hoisted(() => ({
  readBody: vi.fn(async () => ({})),
}));

vi.mock("firebase-admin/messaging", () => ({
  getMessaging: () => ({ sendEachForMulticast: firebaseMessaging.sendEachForMulticast }),
}));
vi.mock("h3", async (importOriginal) => ({
  ...await importOriginal<typeof import("h3")>(),
  readBody: h3Mocks.readBody,
}));

const databaseUrl = process.env.MOBILE_SOCIAL_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

const PLAYERS = {
  leader: { id: "10000000-0000-4000-8000-000000000001", name: "Leader" },
  friend: { id: "10000000-0000-4000-8000-000000000002", name: "Friend" },
  third: { id: "10000000-0000-4000-8000-000000000003", name: "Third" },
  fourth: { id: "10000000-0000-4000-8000-000000000004", name: "Fourth" },
  fifth: { id: "10000000-0000-4000-8000-000000000005", name: "Fifth" },
} as const;

type SocialModule = typeof import("../server/services/mobile-social");
type UserModule = typeof import("../server/services/mobile-user");
type DatabaseModule = typeof import("../db/client");
type RetentionModule = typeof import("../server/services/mobile-data-retention");
type NotificationOutboxModule = typeof import("../server/services/mobile-notification-outbox");

function eventFor(uid: string) {
  return {
    context: { mobileAuth: { uid, token: {} } },
  } as unknown as H3Event;
}

integration("mobile social service", () => {
  let setupSql: Sql;
  let databaseModule: DatabaseModule;
  let social: SocialModule;
  let users: UserModule;
  let retention: RetentionModule;
  let notificationOutbox: NotificationOutboxModule;

  async function provision(uid: string, playerId?: string) {
    await users.requireMobileUser(eventFor(uid));
    if (!playerId) return;
    await setupSql`
      INSERT INTO mobile_player_links
        (firebase_uid, player_id, edition, is_primary)
      VALUES (${uid}, ${playerId}, 'java', true)
    `;
  }

  beforeAll(async () => {
    process.env.NUXT_DATABASE_URL = databaseUrl!;
    process.env.MOBILE_FRIENDS_ENABLED = "true";
    process.env.MOBILE_PARTIES_ENABLED = "true";
    setupSql = postgres(databaseUrl!, { prepare: false, max: 8 });
    await setupSql.unsafe(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      CREATE TABLE playerdata (
        id uuid PRIMARY KEY,
        name varchar(255),
        createdat timestamp,
        lastlogin timestamp
      );
      CREATE TABLE player_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id uuid NOT NULL REFERENCES playerdata(id),
        start_time timestamp NOT NULL,
        end_time timestamp,
        duration bigint,
        server_crash boolean DEFAULT false
      );
    `);
    for (const player of Object.values(PLAYERS)) {
      await setupSql`INSERT INTO playerdata (id, name) VALUES (${player.id}, ${player.name})`;
    }
    for (const migrationName of [
      "0001_mobile_foundation.sql",
      "0002_mobile_social.sql",
      "0003_player_rally.sql",
    ]) {
      const migration = await readFile(new URL(`../drizzle/${migrationName}`, import.meta.url), "utf8");
      await setupSql.unsafe(migration);
    }
    databaseModule = await import("../db/client");
    users = await import("../server/services/mobile-user");
    social = await import("../server/services/mobile-social");
    retention = await import("../server/services/mobile-data-retention");
    notificationOutbox = await import("../server/services/mobile-notification-outbox");
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("setHeader", () => undefined);
  }, 30_000);

  afterAll(async () => {
    vi.unstubAllGlobals();
    await databaseModule?.postgresClient.end({ timeout: 2 });
    await setupSql?.end({ timeout: 2 });
  });

  it("requires an active primary Minecraft link for every social mutation", async () => {
    await provision("unlinked-user");
    await expect(social.sendFriendRequest("unlinked-user", PLAYERS.friend.name))
      .rejects.toMatchObject({ statusCode: 428 });
    await expect(social.createParty("unlinked-user"))
      .rejects.toMatchObject({ statusCode: 428 });
  });

  it("canonicalizes concurrent opposite friend requests and exposes presence only as friendship data", async () => {
    await provision("leader-user", PLAYERS.leader.id);
    await provision("friend-user", PLAYERS.friend.id);
    await provision("third-user", PLAYERS.third.id);

    const results = await Promise.all([
      social.sendFriendRequest("leader-user", "Friend"),
      social.sendFriendRequest("friend-user", "Leader"),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual(["accepted", "pending"]);
    const friendships = await setupSql<{ status: string; count: number }[]>`
      SELECT status, count(*)::int AS count FROM player_friendships GROUP BY status
    `;
    expect(friendships).toEqual([{ status: "accepted", count: 1 }]);
    const notifications = await setupSql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM mobile_notification_outbox WHERE kind = 'friend_request'
    `;
    expect(notifications[0]?.count).toBe(1);

    await setupSql`
      INSERT INTO player_sessions (player_id, start_time) VALUES (${PLAYERS.friend.id}, now())
    `;
    await setupSql`
      INSERT INTO player_sessions (player_id, start_time) VALUES (${PLAYERS.third.id}, now())
    `;
    const snapshot = await social.friendsSnapshot("leader-user");
    expect(snapshot.friends).toEqual([expect.objectContaining({
      playerId: PLAYERS.friend.id,
      online: true,
    })]);
    expect(snapshot.friends.some((friend) => friend.playerId === PLAYERS.third.id)).toBe(false);
  });

  it("makes block and enum-only report operations race-safe and abuse-limited", async () => {
    const blocked = await social.blockPlayer("leader-user", PLAYERS.friend.id);
    expect(blocked.playerId).toBe(PLAYERS.friend.id);
    await expect(social.sendFriendRequest("friend-user", "Leader"))
      .rejects.toMatchObject({ statusCode: 409 });
    const report = await social.reportPlayer("leader-user", PLAYERS.third.id, "cheating");
    expect(report).toMatchObject({ playerId: PLAYERS.third.id, reason: "cheating" });
    await expect(social.reportPlayer("leader-user", PLAYERS.third.id, "cheating"))
      .rejects.toMatchObject({ statusCode: 409 });
    await social.unblockPlayer("leader-user", PLAYERS.friend.id);
  });

  it("serializes party accepts at four members and preserves durable invite outcomes", async () => {
    await provision("fourth-user", PLAYERS.fourth.id);
    await provision("fifth-user", PLAYERS.fifth.id);
    const party = await social.createParty("leader-user");
    const invites = await Promise.all([
      social.inviteToParty("leader-user", PLAYERS.friend.name),
      social.inviteToParty("leader-user", PLAYERS.third.name),
      social.inviteToParty("leader-user", PLAYERS.fourth.name),
      social.inviteToParty("leader-user", PLAYERS.fifth.name),
    ]);
    const duplicate = await social.inviteToParty("leader-user", PLAYERS.fifth.name);
    expect(duplicate.id).toBe(invites[3]!.id);

    const outcomes = await Promise.allSettled([
      social.acceptPartyInvite("friend-user", invites[0]!.id),
      social.acceptPartyInvite("third-user", invites[1]!.id),
      social.acceptPartyInvite("fourth-user", invites[2]!.id),
      social.acceptPartyInvite("fifth-user", invites[3]!.id),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(3);
    expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(1);
    const rejectedIndex = outcomes.findIndex((outcome) => outcome.status === "rejected");
    const rejectedInvite = invites[rejectedIndex]!;
    const rejectedUid = ["friend-user", "third-user", "fourth-user", "fifth-user"][rejectedIndex]!;
    await setupSql`
      UPDATE player_party_invites
         SET created_at = now() - interval '20 minutes',
             expires_at = now() - interval '1 minute'
       WHERE id = ${rejectedInvite.id}
    `;
    await expect(social.acceptPartyInvite(rejectedUid, rejectedInvite.id))
      .rejects.toMatchObject({ statusCode: 409, statusMessage: "Party invite expired" });
    const expired = await setupSql<{ status: string }[]>`
      SELECT status FROM player_party_invites WHERE id = ${rejectedInvite.id}
    `;
    expect(expired[0]?.status).toBe("expired");
    const members = await setupSql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM player_party_members
       WHERE party_id = ${party.id} AND left_at IS NULL
    `;
    expect(members[0]?.count).toBe(4);
    const states = await setupSql<{ status: string; count: number }[]>`
      SELECT status, count(*)::int AS count
        FROM player_party_invites WHERE party_id = ${party.id}
       GROUP BY status ORDER BY status
    `;
    expect(states.reduce((sum, row) => sum + row.count, 0)).toBe(4);
    const partyNotifications = await setupSql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM mobile_notification_outbox WHERE kind = 'party_invite'
    `;
    expect(partyNotifications[0]?.count).toBe(4);
  });

  it("exports an account with only a non-primary link without requiring social identity", async () => {
    const uid = "non-primary-export-user";
    await provision(uid);
    await setupSql`
      INSERT INTO mobile_player_links
        (firebase_uid, player_id, edition, is_primary)
      VALUES (${uid}, ${PLAYERS.fifth.id}, 'bedrock', false)
    `;
    const route = await import("../server/api/mobile/v1/account/export.get");

    const response = await route.default(eventFor(uid));

    expect(response.data.account?.playerLinks).toEqual([
      expect.objectContaining({
        playerId: PLAYERS.fifth.id,
        edition: "bedrock",
        isPrimary: false,
      }),
    ]);
    expect(response.data.social).toEqual({});
  });

  it("preserves deletion tombstones and safety-critical outbox work until Firebase deletion is delivered", async () => {
    const uid = "retention-auth-delete-user";
    const userId = "dfd06bda-9672-40fc-a10d-a9afe0f171d5";
    const authOutboxId = "94c29bd2-ef1f-4b1e-a0a4-6cd59e104a23";
    const ordinaryOutboxId = "680aecc2-5986-4687-8299-2b2a1021493d";
    await setupSql`
      INSERT INTO mobile_users
        (id, firebase_uid, deleted_at, created_at, updated_at)
      VALUES
        (${userId}, ${uid}, now() - interval '31 days', now() - interval '100 days', now())
    `;
    await setupSql`
      INSERT INTO mobile_notification_outbox
        (id, kind, audience, payload, status, attempts, created_at)
      VALUES
        (
          ${authOutboxId},
          'firebase_auth_delete',
          jsonb_build_object('firebaseUid', ${uid}::text),
          '{}'::jsonb,
          'dead',
          99,
          now() - interval '100 days'
        ),
        (
          ${ordinaryOutboxId},
          'announcement',
          '{"all": true}'::jsonb,
          '{"title": "expired"}'::jsonb,
          'dead',
          99,
          now() - interval '100 days'
        )
    `;

    await expect(retention.pruneExpiredMobileData()).resolves.toBe(true);
    const preserved = await setupSql<{
      users: number;
      authRows: number;
      ordinaryRows: number;
    }[]>`
      SELECT
        (SELECT count(*)::int FROM mobile_users WHERE id = ${userId}) AS users,
        (SELECT count(*)::int FROM mobile_notification_outbox WHERE id = ${authOutboxId}) AS "authRows",
        (SELECT count(*)::int FROM mobile_notification_outbox WHERE id = ${ordinaryOutboxId}) AS "ordinaryRows"
    `;
    expect(preserved[0]).toEqual({ users: 1, authRows: 1, ordinaryRows: 0 });

    await setupSql`
      UPDATE mobile_notification_outbox
         SET status = 'delivered', audience = '{}'::jsonb, delivered_at = now()
       WHERE id = ${authOutboxId}
    `;
    await expect(retention.pruneExpiredMobileData()).resolves.toBe(true);
    const afterDelivery = await setupSql<{ users: number }[]>`
      SELECT count(*)::int AS users FROM mobile_users WHERE id = ${userId}
    `;
    expect(afterDelivery[0]?.users).toBe(0);
  });

  it("delivers a structured rally only to active opted-in installations and deduplicates its ID", async () => {
    firebaseMessaging.sendEachForMulticast.mockClear();
    firebaseMessaging.sendEachForMulticast.mockImplementationOnce(async (message) => ({
      responses: message.tokens.map((token) => token === "rally-retry-token"
        ? { success: false, error: { code: "messaging/server-unavailable" } }
        : { success: true }),
    }));
    await setupSql`DELETE FROM mobile_notification_outbox`;
    for (const uid of [
      "rally-enabled-user",
      "rally-disabled-user",
      "rally-device-optout-user",
      "rally-revoked-device-user",
    ]) {
      await provision(uid);
    }
    await setupSql`
      UPDATE mobile_notification_preferences preferences
         SET rally_enabled = true
        FROM mobile_users mobile_user
       WHERE preferences.mobile_user_id = mobile_user.id
         AND mobile_user.firebase_uid IN ('rally-enabled-user', 'rally-device-optout-user', 'rally-revoked-device-user')
    `;
    await setupSql`
      INSERT INTO mobile_devices
        (mobile_user_id, installation_id, platform, fcm_token, notifications_authorized, revoked_at)
      SELECT id, 'rally-enabled-install', 'ios', 'rally-enabled-token', true, NULL::timestamptz
        FROM mobile_users WHERE firebase_uid = 'rally-enabled-user'
      UNION ALL
      SELECT id, 'rally-retry-install', 'android', 'rally-retry-token', true, NULL::timestamptz
        FROM mobile_users WHERE firebase_uid = 'rally-enabled-user'
      UNION ALL
      SELECT id, 'rally-disabled-install', 'android', 'rally-disabled-token', true, NULL::timestamptz
        FROM mobile_users WHERE firebase_uid = 'rally-disabled-user'
      UNION ALL
      SELECT id, 'rally-optout-install', 'ios', 'rally-optout-token', false, NULL::timestamptz
        FROM mobile_users WHERE firebase_uid = 'rally-device-optout-user'
      UNION ALL
      SELECT id, 'rally-revoked-install', 'android', 'rally-revoked-token', true, now()
        FROM mobile_users WHERE firebase_uid = 'rally-revoked-device-user'
    `;
    const rallyId = "a53233cd-20d2-4d15-b093-2caaf4cd7774";
    const rallyPayload = {
      schemaVersion: 1,
      rallyId,
      source: "automatic",
      gamemode: "pitchout",
      edition: "crossplay",
      queuedCount: 1,
      neededCount: 3,
      actorDisplayName: null,
    };
    const rows = await setupSql<{ id: string }[]>`
      INSERT INTO mobile_notification_outbox (kind, audience, payload)
      VALUES ('player_rally', '{"all": true}'::jsonb, ${setupSql.json(rallyPayload)})
      RETURNING id
    `;

    await expect(notificationOutbox.processMobileNotificationOutbox({
      batchSize: 10,
      concurrency: 1,
      maxAttempts: 3,
      staleLockSeconds: 60,
      sendTimeoutMs: 5_000,
    })).resolves.toBe(1);

    expect(firebaseMessaging.sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(firebaseMessaging.sendEachForMulticast).toHaveBeenCalledWith(expect.objectContaining({
      tokens: expect.arrayContaining(["rally-enabled-token", "rally-retry-token"]),
      notification: {
        title: "Players needed for Pitchout",
        body: "1 queued, 3 more needed to start.",
      },
      data: expect.objectContaining({
        type: "player_rally",
        rallyId,
        gamemode: "pitchout",
      }),
    }));
    const pending = await setupSql<{ status: string; retryDevices: number }[]>`
      SELECT status,
             jsonb_array_length(audience -> 'deviceIds') AS "retryDevices"
        FROM mobile_notification_outbox
       WHERE id = ${rows[0]!.id}
    `;
    expect(pending).toEqual([{ status: "pending", retryDevices: 1 }]);

    await setupSql`
      UPDATE mobile_notification_outbox SET available_at = now() WHERE id = ${rows[0]!.id}
    `;
    await expect(notificationOutbox.processMobileNotificationOutbox({
      batchSize: 10,
      concurrency: 1,
      maxAttempts: 3,
      staleLockSeconds: 60,
      sendTimeoutMs: 5_000,
    })).resolves.toBe(1);
    expect(firebaseMessaging.sendEachForMulticast).toHaveBeenCalledTimes(2);
    expect(firebaseMessaging.sendEachForMulticast.mock.calls[1]?.[0].tokens)
      .toEqual(["rally-retry-token"]);
    const delivered = await setupSql<{ status: string }[]>`
      SELECT status FROM mobile_notification_outbox WHERE id = ${rows[0]!.id}
    `;
    expect(delivered[0]?.status).toBe("delivered");

    await expect(setupSql`
      INSERT INTO mobile_notification_outbox (kind, audience, payload)
      VALUES ('player_rally', '{"all": true}'::jsonb, ${setupSql.json(rallyPayload)})
    `).rejects.toMatchObject({ code: "23505" });
  });

  it("exposes the dedicated rally opt-in through notification preferences", async () => {
    const uid = "rally-preference-api-user";
    await provision(uid);
    h3Mocks.readBody.mockResolvedValueOnce({ rallyEnabled: true });
    const route = await import("../server/api/mobile/v1/notification-preferences.put");

    const response = await route.default(eventFor(uid));

    expect(response.data).toMatchObject({ rallyEnabled: true });
    const records = await setupSql<{ rallyEnabled: boolean }[]>`
      SELECT preferences.rally_enabled AS "rallyEnabled"
        FROM mobile_notification_preferences preferences
        JOIN mobile_users mobile_user ON mobile_user.id = preferences.mobile_user_id
       WHERE mobile_user.firebase_uid = ${uid}
    `;
    expect(records).toEqual([{ rallyEnabled: true }]);
  });
});
