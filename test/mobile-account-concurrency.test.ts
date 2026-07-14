import { readFile } from "node:fs/promises";
import { and, eq, isNull } from "drizzle-orm";
import type { H3Event } from "h3";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mobileNotificationPreferences, mobileUsers } from "../db/schema";
import {
  anonymizedFirebaseUid,
  firebaseUidHash,
} from "../server/utils/mobile-identity";
import { linkCodeHmac } from "../server/utils/mobile-validation";

const databaseUrl = process.env.MOBILE_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

type MobileAccountModule = typeof import("../server/services/mobile-account");
type MobileUserModule = typeof import("../server/services/mobile-user");
type DatabaseModule = typeof import("../db/client");
type OutboxModule = typeof import("../server/services/mobile-notification-outbox");
type PlayerLinkModule = typeof import("../server/services/mobile-player-link");

function eventFor(uid: string) {
  return {
    context: {
      mobileAuth: { uid, token: {} },
    },
  } as unknown as H3Event;
}

integration("mobile account deletion concurrency", () => {
  let setupSql: Sql;
  let databaseModule: DatabaseModule;
  let account: MobileAccountModule;
  let users: MobileUserModule;
  let outbox: OutboxModule;
  let playerLinks: PlayerLinkModule;

  beforeAll(async () => {
    process.env.NUXT_DATABASE_URL = databaseUrl!;
    process.env.MOBILE_LINK_PEPPER = "0123456789abcdef0123456789abcdef";
    setupSql = postgres(databaseUrl!, { prepare: false, max: 4 });
    await setupSql.unsafe(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      CREATE TABLE playerdata (id uuid PRIMARY KEY, name varchar(255));
    `);
    const migration = await readFile(
      new URL("../drizzle/0001_mobile_foundation.sql", import.meta.url),
      "utf8",
    );
    await setupSql.unsafe(migration);
    databaseModule = await import("../db/client");
    account = await import("../server/services/mobile-account");
    users = await import("../server/services/mobile-user");
    outbox = await import("../server/services/mobile-notification-outbox");
    playerLinks = await import("../server/services/mobile-player-link");
  }, 30_000);

  afterAll(async () => {
    await databaseModule?.postgresClient.end({ timeout: 2 });
    await setupSql?.end({ timeout: 2 });
  });

  it("never recreates preferences when provisioning races deletion", async () => {
    for (let index = 0; index < 8; index += 1) {
      const uid = `race-user-${index}`;
      await users.requireMobileUser(eventFor(uid));

      const [deletion] = await Promise.allSettled([
        account.beginMobileAccountDeletion(uid),
        users.requireMobileUser(eventFor(uid)),
      ]);
      expect(deletion.status).toBe("fulfilled");
      await expect(users.requireMobileUser(eventFor(uid))).rejects.toMatchObject({
        statusCode: 410,
      });

      const records = await setupSql<{ users: number; preferences: number }[]>`
        SELECT
          (SELECT count(*)::int FROM mobile_users WHERE firebase_uid = ${uid}) AS users,
          (SELECT count(*)::int
             FROM mobile_notification_preferences preferences
             JOIN mobile_users mobile_user ON mobile_user.id = preferences.mobile_user_id
            WHERE mobile_user.firebase_uid = ${uid}) AS preferences
      `;
      expect(records[0]).toEqual({ users: 1, preferences: 0 });
    }
  });

  it("blocks a mutator on the account row and rejects it after deletion commits", async () => {
    const uid = "locked-deletion-user";
    await users.requireMobileUser(eventFor(uid));
    let releaseDeletion!: () => void;
    let signalLocked!: () => void;
    const release = new Promise<void>((resolve) => { releaseDeletion = resolve; });
    const locked = new Promise<void>((resolve) => { signalLocked = resolve; });

    const deletion = databaseModule.default.transaction(async (tx) => {
      const user = await users.lockActiveMobileUser(tx, uid);
      signalLocked();
      await release;
      const updated = await tx
        .update(mobileUsers)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(mobileUsers.id, user.id), isNull(mobileUsers.deletedAt)))
        .returning({ id: mobileUsers.id });
      expect(updated).toHaveLength(1);
      await tx
        .delete(mobileNotificationPreferences)
        .where(eq(mobileNotificationPreferences.mobileUserId, user.id));
    });
    await locked;

    let mutatorEntered = false;
    const mutator = databaseModule.default.transaction(async (tx) => {
      await users.lockActiveMobileUser(tx, uid);
      mutatorEntered = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mutatorEntered).toBe(false);
    releaseDeletion();
    await deletion;
    await expect(mutator).rejects.toMatchObject({ statusCode: 410 });
    expect(mutatorEntered).toBe(false);
  });

  it("keeps Firebase deletions claimable after the generic attempt limit", async () => {
    await setupSql`DELETE FROM mobile_notification_outbox`;
    const rows = await setupSql<{ id: string; kind: string }[]>`
      INSERT INTO mobile_notification_outbox
        (kind, audience, payload, status, attempts, available_at)
      VALUES
        (
          'firebase_auth_delete',
          jsonb_build_object('firebaseUid', 'delete-retry-user'),
          '{}'::jsonb,
          'dead',
          99,
          now()
        ),
        ('announcement', '{"all": true}'::jsonb, '{"title": "test"}'::jsonb, 'pending', 99, now())
      RETURNING id, kind
    `;
    const authDelete = rows.find((row) => row.kind === "firebase_auth_delete")!;
    const announcement = rows.find((row) => row.kind === "announcement")!;

    const claimed = await outbox.claimMobileNotificationOutboxRows({
      batchSize: 10,
      concurrency: 1,
      maxAttempts: 6,
      staleLockSeconds: 60,
      sendTimeoutMs: 5_000,
    });
    expect(claimed).toHaveLength(1);
    expect(claimed[0]).toMatchObject({
      id: authDelete.id,
      kind: "firebase_auth_delete",
      attempts: 100,
    });

    const states = await setupSql<{ id: string; status: string }[]>`
      SELECT id, status
        FROM mobile_notification_outbox
       WHERE id IN (${authDelete.id}, ${announcement.id})
    `;
    expect(states.find((row) => row.id === authDelete.id)?.status).toBe("processing");
    expect(states.find((row) => row.id === announcement.id)?.status).toBe("dead");
  });

  it("atomically anonymizes the Firebase identity when deletion completes", async () => {
    const uid = "completed-deletion-user";
    await users.requireMobileUser(eventFor(uid));
    const deletion = await account.beginMobileAccountDeletion(uid);

    await account.completeFirebaseIdentityDeletion(deletion.outboxId, uid);

    const records = await setupSql<{
      firebaseUid: string;
      deletedFirebaseUidHash: string | null;
      status: string;
      audience: Record<string, unknown>;
      lockToken: string | null;
      lockedAt: Date | null;
      lastError: string | null;
    }[]>`
      SELECT mobile_user.firebase_uid AS "firebaseUid",
             mobile_user.deleted_firebase_uid_hash AS "deletedFirebaseUidHash",
             outbox.status,
             outbox.audience,
             outbox.lock_token AS "lockToken",
             outbox.locked_at AS "lockedAt",
             outbox.last_error AS "lastError"
        FROM mobile_users mobile_user
        JOIN mobile_notification_outbox outbox ON outbox.id = ${deletion.outboxId}
       WHERE mobile_user.id = ${deletion.userId}
    `;
    expect(records).toEqual([{
      firebaseUid: anonymizedFirebaseUid(deletion.userId),
      deletedFirebaseUidHash: firebaseUidHash(uid),
      status: "delivered",
      audience: {},
      lockToken: null,
      lockedAt: null,
      lastError: null,
    }]);
    const originals = await setupSql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM mobile_users WHERE firebase_uid = ${uid}
    `;
    expect(originals[0]?.count).toBe(0);
    await expect(users.requireMobileUser(eventFor(uid))).rejects.toMatchObject({
      statusCode: 410,
    });
  });

  it("rolls back anonymization when the matching outbox row is unavailable", async () => {
    const uid = "failed-completion-user";
    await users.requireMobileUser(eventFor(uid));
    const deletion = await account.beginMobileAccountDeletion(uid);
    const missingOutboxId = "4f3d0f0a-1f9d-4d5d-a1b7-70ab53ca9829";

    await expect(
      account.completeFirebaseIdentityDeletion(missingOutboxId, uid),
    ).rejects.toThrow("Firebase identity deletion outbox row is unavailable");

    const records = await setupSql<{
      firebaseUid: string;
      deletedFirebaseUidHash: string | null;
      status: string;
      audience: Record<string, unknown>;
    }[]>`
      SELECT mobile_user.firebase_uid AS "firebaseUid",
             mobile_user.deleted_firebase_uid_hash AS "deletedFirebaseUidHash",
             outbox.status,
             outbox.audience
        FROM mobile_users mobile_user
        JOIN mobile_notification_outbox outbox ON outbox.id = ${deletion.outboxId}
       WHERE mobile_user.id = ${deletion.userId}
    `;
    expect(records).toEqual([{
      firebaseUid: uid,
      deletedFirebaseUidHash: null,
      status: "pending",
      audience: { firebaseUid: uid },
    }]);
  });

  it("makes direct and worker deletion completion idempotent under a race", async () => {
    await setupSql`DELETE FROM mobile_notification_outbox`;
    const uid = "completion-race-user";
    await users.requireMobileUser(eventFor(uid));
    const deletion = await account.beginMobileAccountDeletion(uid);
    const claimed = await outbox.claimMobileNotificationOutboxRows({
      batchSize: 10,
      concurrency: 1,
      maxAttempts: 6,
      staleLockSeconds: 60,
      sendTimeoutMs: 5_000,
    });
    const claimedDeletion = claimed.find((row) => row.id === deletion.outboxId);
    expect(claimedDeletion).toBeDefined();

    await Promise.all([
      account.completeFirebaseIdentityDeletion(deletion.outboxId, uid),
      outbox.deliverFirebaseAuthDeletion(claimedDeletion!, async () => {}),
    ]);

    const records = await setupSql<{
      users: number;
      hashedUsers: number;
      originalUsers: number;
      status: string;
      audience: Record<string, unknown>;
      lockToken: string | null;
    }[]>`
      SELECT
        (SELECT count(*)::int FROM mobile_users WHERE id = ${deletion.userId}) AS users,
        (SELECT count(*)::int
           FROM mobile_users
          WHERE deleted_firebase_uid_hash = ${firebaseUidHash(uid)}) AS "hashedUsers",
        (SELECT count(*)::int
           FROM mobile_users
          WHERE firebase_uid = ${uid}) AS "originalUsers",
        outbox.status,
        outbox.audience,
        outbox.lock_token AS "lockToken"
      FROM mobile_notification_outbox outbox
      WHERE outbox.id = ${deletion.outboxId}
    `;
    expect(records).toEqual([{
      users: 1,
      hashedUsers: 1,
      originalUsers: 0,
      status: "delivered",
      audience: {},
      lockToken: null,
    }]);
  });

  it("consumes a link code and starts local deletion in one transaction", async () => {
    const uid = "link-code-deletion-user";
    const playerId = "54cb88eb-6942-4ea4-a714-a5e543587b58";
    const challengeId = "03a6f929-7f74-4376-b2a3-984632b37c74";
    const code = "CD45EF67";
    const codeHmac = linkCodeHmac(code, process.env.MOBILE_LINK_PEPPER!);
    await users.requireMobileUser(eventFor(uid));
    await setupSql`
      INSERT INTO playerdata (id, name) VALUES (${playerId}, 'DeleteByCode')
    `;
    await setupSql`
      INSERT INTO mobile_player_links
        (firebase_uid, player_id, edition, is_primary)
      VALUES (${uid}, ${playerId}, 'java', true)
    `;
    await setupSql`
      INSERT INTO player_link_challenges
        (id, player_id, edition, code_hmac, expires_at, created_at)
      VALUES
        (${challengeId}, ${playerId}, 'java', ${codeHmac}, now() + interval '10 minutes', now())
    `;

    const deletion = await playerLinks.beginMobileAccountDeletionByLinkCode(code);
    expect(deletion).toMatchObject({ firebaseUid: uid, playerId, edition: "java" });

    const records = await setupSql<{
      consumed: boolean;
      deleted: boolean;
      links: number;
      preferences: number;
      outboxId: string;
      status: string;
      audience: Record<string, unknown>;
    }[]>`
      SELECT challenge.consumed_at IS NOT NULL AS consumed,
             mobile_user.deleted_at IS NOT NULL AS deleted,
             (SELECT count(*)::int FROM mobile_player_links WHERE firebase_uid = ${uid}) AS links,
             (SELECT count(*)::int
                FROM mobile_notification_preferences
               WHERE mobile_user_id = mobile_user.id) AS preferences,
             outbox.id AS "outboxId",
             outbox.status,
             outbox.audience
        FROM player_link_challenges challenge
        JOIN mobile_users mobile_user ON mobile_user.firebase_uid = ${uid}
        JOIN mobile_notification_outbox outbox ON outbox.id = ${deletion.outboxId}
       WHERE challenge.id = ${challengeId}
    `;
    expect(records).toEqual([{
      consumed: true,
      deleted: true,
      links: 0,
      preferences: 0,
      outboxId: deletion.outboxId,
      status: "pending",
      audience: { firebaseUid: uid },
    }]);
  });

  it("does not burn a link code when local account deletion cannot start", async () => {
    const orphanUid = "orphan-link-code-user";
    const playerId = "849c187d-6253-425d-9ea0-3ff0b0ed0c35";
    const challengeId = "af1fca90-6824-4baa-9266-a96ea18feb6d";
    const code = "GH67JK89";
    const codeHmac = linkCodeHmac(code, process.env.MOBILE_LINK_PEPPER!);
    await setupSql`
      INSERT INTO playerdata (id, name) VALUES (${playerId}, 'OrphanDelete')
    `;
    await setupSql`
      INSERT INTO mobile_player_links
        (firebase_uid, player_id, edition, is_primary)
      VALUES (${orphanUid}, ${playerId}, 'bedrock', true)
    `;
    await setupSql`
      INSERT INTO player_link_challenges
        (id, player_id, edition, code_hmac, expires_at, created_at)
      VALUES
        (${challengeId}, ${playerId}, 'bedrock', ${codeHmac}, now() + interval '10 minutes', now())
    `;

    await expect(playerLinks.beginMobileAccountDeletionByLinkCode(code))
      .rejects.toMatchObject({ statusCode: 410, statusMessage: "Account deleted" });

    const records = await setupSql<{
      consumed: boolean;
      links: number;
      authDeletions: number;
    }[]>`
      SELECT challenge.consumed_at IS NOT NULL AS consumed,
             (SELECT count(*)::int
                FROM mobile_player_links
               WHERE firebase_uid = ${orphanUid} AND revoked_at IS NULL) AS links,
             (SELECT count(*)::int
                FROM mobile_notification_outbox
               WHERE kind = 'firebase_auth_delete'
                 AND audience ->> 'firebaseUid' = ${orphanUid}) AS "authDeletions"
        FROM player_link_challenges challenge
       WHERE challenge.id = ${challengeId}
    `;
    expect(records).toEqual([{ consumed: false, links: 1, authDeletions: 0 }]);
  });

  it("cannot claim a challenge concurrently revoked under the player lock", async () => {
    const uid = "link-revoke-race-user";
    const playerId = "14a281bb-82b5-4f75-aa37-a42ec54dfd41";
    const challengeId = "ad98632f-262e-47e2-844b-11d53be7866a";
    const codeHmac = "6e274e7e3258346ff0383180a07b70c438e169152ffe46ca480741c143af5f25";
    await users.requireMobileUser(eventFor(uid));
    await setupSql`
      INSERT INTO playerdata (id, name) VALUES (${playerId}, 'RacePlayer')
    `;
    await setupSql`
      INSERT INTO player_link_challenges
        (id, player_id, edition, code_hmac, expires_at, created_at)
      VALUES
        (${challengeId}, ${playerId}, 'java', ${codeHmac}, now() + interval '10 minutes', now())
    `;

    let signalLocked!: () => void;
    let releaseRevoke!: () => void;
    const locked = new Promise<void>((resolve) => { signalLocked = resolve; });
    const release = new Promise<void>((resolve) => { releaseRevoke = resolve; });
    const revoke = setupSql.begin(async (sql) => {
      await sql`SELECT id FROM playerdata WHERE id = ${playerId} FOR UPDATE`;
      signalLocked();
      await release;
      await sql`
        UPDATE player_link_challenges
           SET consumed_at = now()
         WHERE player_id = ${playerId}
           AND consumed_at IS NULL
      `;
    });
    await locked;
    const claim = playerLinks.claimPlayerLink(uid, "AB23CD45");
    const claimExpectation = expect(claim).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Invalid or expired link code",
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    releaseRevoke();
    await revoke;

    await claimExpectation;
    const links = await setupSql<{ count: number }[]>`
      SELECT count(*)::int AS count
        FROM mobile_player_links
       WHERE player_id = ${playerId}
         AND revoked_at IS NULL
    `;
    expect(links[0]?.count).toBe(0);
  });
});
