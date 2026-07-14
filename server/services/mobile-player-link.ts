import { and, asc, eq, isNull } from "drizzle-orm";
import { createError } from "h3";
import db from "../../db/client";
import {
  mobilePlayerLinks,
  playerdata,
  playerLinkChallenges,
} from "../../db/schema";
import { linkCodeHmac } from "../utils/mobile-validation";
import {
  beginMobileAccountDeletionInTransaction,
  lockMobileAccountForDeletion,
} from "./mobile-account";
import { lockActiveMobileUser } from "./mobile-user";

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function claimPlayerLink(firebaseUid: string, code: string) {
  const pepper = process.env.MOBILE_LINK_PEPPER;
  if (!pepper) {
    throw createError({ statusCode: 503, statusMessage: "Player linking is not configured" });
  }
  const codeHmac = linkCodeHmac(code, pepper);

  try {
    return await db.transaction(async (tx) => {
      await lockActiveMobileUser(tx, firebaseUid);

      const candidates = await tx
        .select()
        .from(playerLinkChallenges)
        .where(and(
          eq(playerLinkChallenges.codeHmac, codeHmac),
          isNull(playerLinkChallenges.consumedAt),
        ))
        .limit(1);
      const candidate = candidates[0];
      if (!candidate || candidate.expiresAt <= new Date()) {
        throw createError({ statusCode: 400, statusMessage: "Invalid or expired link code" });
      }

      // CookieDough creates/revokes challenges while holding the playerdata row.
      // Follow the same player -> challenge lock order, then re-read the challenge
      // under lock so a concurrent in-game revoke cannot be undone by this claim.
      const players = await tx
        .select({ id: playerdata.id, name: playerdata.name })
        .from(playerdata)
        .where(eq(playerdata.id, candidate.playerId))
        .limit(1)
        .for("update");
      const player = players[0];
      if (!player) {
        throw createError({ statusCode: 400, statusMessage: "Invalid or expired link code" });
      }
      const challenges = await tx
        .select()
        .from(playerLinkChallenges)
        .where(and(
          eq(playerLinkChallenges.id, candidate.id),
          eq(playerLinkChallenges.playerId, player.id),
          eq(playerLinkChallenges.codeHmac, codeHmac),
          isNull(playerLinkChallenges.consumedAt),
        ))
        .limit(1)
        .for("update");
      const challenge = challenges[0];
      if (!challenge || challenge.expiresAt <= new Date()) {
        throw createError({ statusCode: 400, statusMessage: "Invalid or expired link code" });
      }

      const activeOwners = await tx
        .select({ firebaseUid: mobilePlayerLinks.firebaseUid })
        .from(mobilePlayerLinks)
        .where(and(
          eq(mobilePlayerLinks.playerId, challenge.playerId),
          eq(mobilePlayerLinks.edition, challenge.edition),
          isNull(mobilePlayerLinks.revokedAt),
        ))
        .limit(1);
      if (activeOwners[0] && activeOwners[0].firebaseUid !== firebaseUid) {
        throw createError({ statusCode: 400, statusMessage: "Invalid or expired link code" });
      }

      const primaryLinks = await tx
        .select({ playerId: mobilePlayerLinks.playerId })
        .from(mobilePlayerLinks)
        .where(and(
          eq(mobilePlayerLinks.firebaseUid, firebaseUid),
          eq(mobilePlayerLinks.isPrimary, true),
          isNull(mobilePlayerLinks.revokedAt),
        ))
        .limit(1);
      const isPrimary = primaryLinks.length === 0;
      const now = new Date();

      await tx
        .insert(mobilePlayerLinks)
        .values({
          firebaseUid,
          playerId: challenge.playerId,
          edition: challenge.edition,
          isPrimary,
          linkedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            mobilePlayerLinks.firebaseUid,
            mobilePlayerLinks.playerId,
            mobilePlayerLinks.edition,
          ],
          set: { isPrimary, linkedAt: now, revokedAt: null },
        });

      const consumed = await tx
        .update(playerLinkChallenges)
        .set({ consumedAt: now })
        .where(and(
          eq(playerLinkChallenges.id, challenge.id),
          isNull(playerLinkChallenges.consumedAt),
        ))
        .returning({ id: playerLinkChallenges.id });
      if (!consumed.length) {
        throw createError({ statusCode: 400, statusMessage: "Invalid or expired link code" });
      }

      return {
        playerId: challenge.playerId,
        playerName: player.name,
        edition: challenge.edition,
        isPrimary,
        linkedAt: now,
      };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid or expired link code" });
    }
    throw error;
  }
}

export async function revokePlayerLinks(
  firebaseUid: string,
  filters: { playerId?: string; edition?: "java" | "bedrock" },
) {
  return db.transaction(async (tx) => {
    await lockActiveMobileUser(tx, firebaseUid);

    const conditions = [
      eq(mobilePlayerLinks.firebaseUid, firebaseUid),
      isNull(mobilePlayerLinks.revokedAt),
    ];
    if (filters.playerId) conditions.push(eq(mobilePlayerLinks.playerId, filters.playerId));
    if (filters.edition) conditions.push(eq(mobilePlayerLinks.edition, filters.edition));

    const revoked = await tx
      .update(mobilePlayerLinks)
      .set({ revokedAt: new Date(), isPrimary: false })
      .where(and(...conditions))
      .returning({
        playerId: mobilePlayerLinks.playerId,
        edition: mobilePlayerLinks.edition,
      });

    const remainingPrimary = await tx
      .select({ playerId: mobilePlayerLinks.playerId })
      .from(mobilePlayerLinks)
      .where(and(
        eq(mobilePlayerLinks.firebaseUid, firebaseUid),
        eq(mobilePlayerLinks.isPrimary, true),
        isNull(mobilePlayerLinks.revokedAt),
      ))
      .limit(1);

    if (!remainingPrimary.length) {
      const replacements = await tx
        .select({
          playerId: mobilePlayerLinks.playerId,
          edition: mobilePlayerLinks.edition,
        })
        .from(mobilePlayerLinks)
        .where(and(
          eq(mobilePlayerLinks.firebaseUid, firebaseUid),
          isNull(mobilePlayerLinks.revokedAt),
        ))
        .orderBy(asc(mobilePlayerLinks.linkedAt))
        .limit(1)
        .for("update");
      const replacement = replacements[0];
      if (replacement) {
        await tx
          .update(mobilePlayerLinks)
          .set({ isPrimary: true })
          .where(and(
            eq(mobilePlayerLinks.firebaseUid, firebaseUid),
            eq(mobilePlayerLinks.playerId, replacement.playerId),
            eq(mobilePlayerLinks.edition, replacement.edition),
          ));
      }
    }

    return revoked;
  });
}

/**
 * Consumes a fresh in-game link challenge and resolves the already linked
 * mobile identity for no-app account deletion. Possession of the short-lived
 * code proves current control of the Minecraft player without exposing the
 * Firebase identifier to the browser.
 */
export async function beginMobileAccountDeletionByLinkCode(code: string) {
  const pepper = process.env.MOBILE_LINK_PEPPER;
  if (!pepper) {
    throw createError({ statusCode: 503, statusMessage: "Player linking is not configured" });
  }
  const codeHmac = linkCodeHmac(code, pepper);

  return db.transaction(async (tx) => {
    const candidates = await tx
      .select()
      .from(playerLinkChallenges)
      .where(and(
        eq(playerLinkChallenges.codeHmac, codeHmac),
        isNull(playerLinkChallenges.consumedAt),
      ))
      .limit(1);
    const candidate = candidates[0];
    if (!candidate || candidate.expiresAt <= new Date()) {
      throw createError({ statusCode: 400, statusMessage: "Invalid or expired link code" });
    }

    const initialLinks = await tx
      .select({ firebaseUid: mobilePlayerLinks.firebaseUid })
      .from(mobilePlayerLinks)
      .where(and(
        eq(mobilePlayerLinks.playerId, candidate.playerId),
        eq(mobilePlayerLinks.edition, candidate.edition),
        isNull(mobilePlayerLinks.revokedAt),
      ))
      .limit(1);
    const firebaseUid = initialLinks[0]?.firebaseUid;
    if (!firebaseUid) {
      throw createError({ statusCode: 404, statusMessage: "No linked mobile account" });
    }

    // Match the regular account/link mutation lock order before taking the Minecraft player row.
    // Keeping challenge consumption and local account deletion in this transaction means a
    // transient deletion failure cannot burn the user's only ten-minute verification code.
    const mobileUser = await lockMobileAccountForDeletion(tx, firebaseUid);

    const players = await tx
      .select({ id: playerdata.id })
      .from(playerdata)
      .where(eq(playerdata.id, candidate.playerId))
      .limit(1)
      .for("update");
    if (!players[0]) {
      throw createError({ statusCode: 400, statusMessage: "Invalid or expired link code" });
    }

    const challenges = await tx
      .select()
      .from(playerLinkChallenges)
      .where(and(
        eq(playerLinkChallenges.id, candidate.id),
        eq(playerLinkChallenges.codeHmac, codeHmac),
        isNull(playerLinkChallenges.consumedAt),
      ))
      .limit(1)
      .for("update");
    const challenge = challenges[0];
    if (!challenge || challenge.expiresAt <= new Date()) {
      throw createError({ statusCode: 400, statusMessage: "Invalid or expired link code" });
    }

    const links = await tx
      .select({ firebaseUid: mobilePlayerLinks.firebaseUid })
      .from(mobilePlayerLinks)
      .where(and(
        eq(mobilePlayerLinks.playerId, challenge.playerId),
        eq(mobilePlayerLinks.edition, challenge.edition),
        eq(mobilePlayerLinks.firebaseUid, firebaseUid),
        isNull(mobilePlayerLinks.revokedAt),
      ))
      .limit(1);
    if (!links[0]) {
      throw createError({ statusCode: 404, statusMessage: "No linked mobile account" });
    }

    const deletion = await beginMobileAccountDeletionInTransaction(
      tx,
      firebaseUid,
      mobileUser,
    );

    const consumedAt = new Date();
    const consumed = await tx
      .update(playerLinkChallenges)
      .set({ consumedAt })
      .where(and(
        eq(playerLinkChallenges.id, challenge.id),
        isNull(playerLinkChallenges.consumedAt),
      ))
      .returning({ id: playerLinkChallenges.id });
    if (!consumed.length) {
      throw createError({ statusCode: 400, statusMessage: "Invalid or expired link code" });
    }

    return {
      ...deletion,
      firebaseUid,
      playerId: challenge.playerId,
      edition: challenge.edition,
    };
  });
}
