import { and, eq, isNull, sql } from "drizzle-orm";
import { createError, type H3Event } from "h3";
import db from "../../db/client";
import {
  mobileNotificationPreferences,
  mobilePlayerLinks,
  mobileUsers,
  playerdata,
} from "../../db/schema";
import { requireMobileAuth } from "../utils/mobile-auth";
import { firebaseUidHash } from "../utils/mobile-identity";

export type MobileDbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function claimText(value: string | undefined, maximum: number) {
  const text = value?.trim();
  return text ? text.slice(0, maximum) : null;
}

export function accountDeletedError() {
  return createError({ statusCode: 410, statusMessage: "Account deleted" });
}

export async function lockFirebaseIdentity(
  tx: MobileDbTransaction,
  firebaseUid: string,
) {
  await tx.execute(sql`
    SELECT pg_advisory_xact_lock(hashtextextended(${firebaseUid}, 20260714))
  `);
}

export async function lockActiveMobileUser(
  tx: MobileDbTransaction,
  firebaseUid: string,
) {
  const rows = await tx
    .select()
    .from(mobileUsers)
    .where(eq(mobileUsers.firebaseUid, firebaseUid))
    .limit(1)
    .for("update");
  const user = rows[0];
  if (!user || user.deletedAt) throw accountDeletedError();
  return user;
}

export async function requireMobileUser(event: H3Event) {
  const auth = requireMobileAuth(event);
  return db.transaction(async (tx) => {
    await lockFirebaseIdentity(tx, auth.uid);
    const tombstones = await tx
      .select({ id: mobileUsers.id })
      .from(mobileUsers)
      .where(eq(mobileUsers.deletedFirebaseUidHash, firebaseUidHash(auth.uid)))
      .limit(1);
    if (tombstones.length) throw accountDeletedError();

    await tx
      .insert(mobileUsers)
      .values({
        firebaseUid: auth.uid,
        email: claimText(auth.email, 320),
        displayName: claimText(auth.name, 80),
        avatarUrl: claimText(auth.picture, 2048),
      })
      .onConflictDoNothing({ target: mobileUsers.firebaseUid })
      .returning({ id: mobileUsers.id });

    const current = await lockActiveMobileUser(tx, auth.uid);
    const updated = await tx
      .update(mobileUsers)
      .set({
        email: claimText(auth.email, 320) ?? current.email,
        displayName: claimText(auth.name, 80) ?? current.displayName,
        avatarUrl: claimText(auth.picture, 2048) ?? current.avatarUrl,
        updatedAt: new Date(),
      })
      .where(and(eq(mobileUsers.id, current.id), isNull(mobileUsers.deletedAt)))
      .returning();
    const user = updated[0];
    if (!user) throw accountDeletedError();

    await tx
      .insert(mobileNotificationPreferences)
      .values({ mobileUserId: user.id })
      .onConflictDoNothing({ target: mobileNotificationPreferences.mobileUserId });

    return { auth, user };
  });
}

export async function mobileMe(firebaseUid: string) {
  const user = await db.query.mobileUsers.findFirst({
    where: and(eq(mobileUsers.firebaseUid, firebaseUid), isNull(mobileUsers.deletedAt)),
  });
  if (!user) return undefined;

  const links = await db
    .select({
      playerId: mobilePlayerLinks.playerId,
      playerName: playerdata.name,
      edition: mobilePlayerLinks.edition,
      isPrimary: mobilePlayerLinks.isPrimary,
      linkedAt: mobilePlayerLinks.linkedAt,
    })
    .from(mobilePlayerLinks)
    .innerJoin(playerdata, eq(playerdata.id, mobilePlayerLinks.playerId))
    .where(and(
      eq(mobilePlayerLinks.firebaseUid, firebaseUid),
      isNull(mobilePlayerLinks.revokedAt),
    ));

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
    timezone: user.timezone,
    createdAt: user.createdAt,
    playerLinks: links,
  };
}
