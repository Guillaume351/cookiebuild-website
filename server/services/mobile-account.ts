import { and, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import db from "../../db/client";
import {
  mobileDevices,
  mobileNotificationOutbox,
  mobileNotificationPreferences,
  mobilePlayerLinks,
  mobileUsers,
} from "../../db/schema";
import {
  accountDeletedError,
  lockActiveMobileUser,
  lockFirebaseIdentity,
  type MobileDbTransaction,
} from "./mobile-user";
import {
  anonymizedFirebaseUid,
  firebaseUidHash,
} from "../utils/mobile-identity";

type LockedMobileUser = Awaited<ReturnType<typeof lockActiveMobileUser>>;

export async function lockMobileAccountForDeletion(
  tx: MobileDbTransaction,
  firebaseUid: string,
) {
  await lockFirebaseIdentity(tx, firebaseUid);
  return lockActiveMobileUser(tx, firebaseUid);
}

export async function beginMobileAccountDeletionInTransaction(
  tx: MobileDbTransaction,
  firebaseUid: string,
  user: LockedMobileUser,
) {
    const now = new Date();
    const deleted = await tx
      .update(mobileUsers)
      .set({
        email: null,
        displayName: null,
        avatarUrl: null,
        locale: null,
        timezone: null,
        deletedAt: now,
        updatedAt: now,
      })
      .where(and(eq(mobileUsers.id, user.id), isNull(mobileUsers.deletedAt)))
      .returning({ id: mobileUsers.id });
    if (!deleted.length) throw accountDeletedError();

    await tx.execute(sql`
      DELETE FROM mobile_friend_online_alerts alert
       WHERE alert.owner_player_id IN (
         SELECT link.player_id FROM mobile_player_links link
          WHERE link.firebase_uid = ${firebaseUid} AND link.revoked_at IS NULL
       )
    `);
    await tx.execute(sql`
      DELETE FROM mobile_notification_outbox outbox
       WHERE outbox.kind <> 'firebase_auth_delete'
         AND outbox.audience ->> 'firebaseUid' = ${firebaseUid}
    `);
    await tx.delete(mobilePlayerLinks).where(eq(mobilePlayerLinks.firebaseUid, firebaseUid));
    await tx.delete(mobileDevices).where(eq(mobileDevices.mobileUserId, user.id));
    await tx
      .delete(mobileNotificationPreferences)
      .where(eq(mobileNotificationPreferences.mobileUserId, user.id));
    const queued = await tx
      .insert(mobileNotificationOutbox)
      .values({
        kind: "firebase_auth_delete",
        audience: { firebaseUid },
        payload: {},
      })
      .returning({ id: mobileNotificationOutbox.id });

    return { userId: user.id, outboxId: queued[0]!.id };
}

export async function beginMobileAccountDeletion(firebaseUid: string) {
  return db.transaction(async (tx) => {
    const user = await lockMobileAccountForDeletion(tx, firebaseUid);
    return beginMobileAccountDeletionInTransaction(tx, firebaseUid, user);
  });
}

export async function completeFirebaseIdentityDeletion(
  outboxId: string,
  firebaseUid: string,
) {
  const uidHash = firebaseUidHash(firebaseUid);
  return db.transaction(async (tx) => {
    await lockFirebaseIdentity(tx, firebaseUid);
    const outboxRows = await tx
      .select({
        id: mobileNotificationOutbox.id,
        kind: mobileNotificationOutbox.kind,
        audience: mobileNotificationOutbox.audience,
        status: mobileNotificationOutbox.status,
      })
      .from(mobileNotificationOutbox)
      .where(eq(mobileNotificationOutbox.id, outboxId))
      .limit(1)
      .for("update");
    const outbox = outboxRows[0];
    if (!outbox || outbox.kind !== "firebase_auth_delete") {
      throw new Error("Firebase identity deletion outbox row is unavailable");
    }
    const audience = typeof outbox.audience === "object" && outbox.audience !== null
      ? outbox.audience as Record<string, unknown>
      : {};
    if (
      outbox.status !== "delivered"
      && (typeof audience.firebaseUid !== "string" || audience.firebaseUid !== firebaseUid)
    ) {
      throw new Error("Firebase identity deletion outbox ownership mismatch");
    }

    const users = await tx
      .select({ id: mobileUsers.id })
      .from(mobileUsers)
      .where(and(
        isNotNull(mobileUsers.deletedAt),
        or(
          eq(mobileUsers.firebaseUid, firebaseUid),
          eq(mobileUsers.deletedFirebaseUidHash, uidHash),
        ),
      ))
      .limit(1)
      .for("update");
    const user = users[0];
    if (!user) throw new Error("Deleted mobile account tombstone is unavailable");

    const anonymized = await tx
      .update(mobileUsers)
      .set({
        firebaseUid: anonymizedFirebaseUid(user.id),
        deletedFirebaseUidHash: uidHash,
        updatedAt: new Date(),
      })
      .where(and(eq(mobileUsers.id, user.id), isNotNull(mobileUsers.deletedAt)))
      .returning({ id: mobileUsers.id });
    if (!anonymized.length) throw new Error("Deleted mobile account could not be anonymized");

    const delivered = await tx
      .update(mobileNotificationOutbox)
      .set({
        status: "delivered",
        audience: {},
        deliveredAt: new Date(),
        lockedAt: null,
        lockToken: null,
        lastError: null,
      })
      .where(eq(mobileNotificationOutbox.id, outboxId))
      .returning({ id: mobileNotificationOutbox.id });
    if (!delivered.length) throw new Error("Firebase identity deletion could not be completed");

    return { userId: user.id, outboxId };
  });
}
