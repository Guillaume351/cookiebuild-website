import { sql } from "drizzle-orm";
import { createError } from "h3";
import db from "../../db/client";
import { mobileNotificationOutbox } from "../../db/schema";
import type { MobileDbTransaction } from "./mobile-user";
import { lockActiveMobileUser } from "./mobile-user";
import {
  canonicalPlayerPair,
  type PlayerReportReason,
} from "../utils/mobile-social";

const PARTY_SIZE_LIMIT = 4;
const PARTY_INVITE_MINUTES = 15;

interface PrimaryPlayer {
  playerId: string;
  playerName: string;
}

interface PlayerRow extends Record<string, unknown> {
  playerId: string;
  playerName: string | null;
}

function conflict(statusMessage: string) {
  return createError({ statusCode: 409, statusMessage });
}

function notFound(statusMessage = "Player not found") {
  return createError({ statusCode: 404, statusMessage });
}

function iso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function lockPlayer(tx: MobileDbTransaction, playerId: string) {
  await tx.execute(sql`
    SELECT pg_advisory_xact_lock(hashtextextended(${playerId}, 0))
  `);
}

async function lockPlayerPair(tx: MobileDbTransaction, first: string, second: string) {
  const pair = canonicalPlayerPair(first, second);
  await lockPlayer(tx, pair.playerLowId);
  await lockPlayer(tx, pair.playerHighId);
  return pair;
}

export async function requirePrimaryLinkedPlayer(
  tx: MobileDbTransaction,
  firebaseUid: string,
): Promise<PrimaryPlayer> {
  await lockActiveMobileUser(tx, firebaseUid);
  const rows = await tx.execute<PlayerRow>(sql`
    SELECT link.player_id AS "playerId", player.name AS "playerName"
      FROM mobile_player_links link
      JOIN playerdata player ON player.id = link.player_id
     WHERE link.firebase_uid = ${firebaseUid}
       AND link.is_primary
       AND link.revoked_at IS NULL
     LIMIT 1
     FOR UPDATE OF link
  `);
  const player = rows[0];
  if (!player) {
    throw createError({ statusCode: 428, statusMessage: "Primary player link required" });
  }
  return { playerId: player.playerId, playerName: player.playerName ?? "Unknown player" };
}

async function exactPlayer(tx: MobileDbTransaction, name: string) {
  const rows = await tx.execute<PlayerRow>(sql`
    SELECT id AS "playerId", name AS "playerName"
      FROM playerdata
     WHERE lower(name) = lower(${name})
     ORDER BY id
     LIMIT 2
  `);
  if (rows.length === 0) throw notFound();
  if (rows.length > 1) throw conflict("Player name is ambiguous");
  return {
    playerId: rows[0]!.playerId,
    playerName: rows[0]!.playerName ?? name,
  };
}

async function playerById(tx: MobileDbTransaction, id: string) {
  const rows = await tx.execute<PlayerRow>(sql`
    SELECT id AS "playerId", name AS "playerName"
      FROM playerdata
     WHERE id = ${id}
     LIMIT 1
  `);
  if (!rows[0]) throw notFound();
  return { playerId: rows[0].playerId, playerName: rows[0].playerName ?? "Unknown player" };
}

async function assertUnblocked(tx: MobileDbTransaction, first: string, second: string) {
  const rows = await tx.execute(sql`
    SELECT 1
      FROM player_blocks
     WHERE (blocker_player_id = ${first} AND blocked_player_id = ${second})
        OR (blocker_player_id = ${second} AND blocked_player_id = ${first})
     LIMIT 1
  `);
  if (rows.length) throw conflict("Player is unavailable");
}

async function targetFirebaseUid(tx: MobileDbTransaction, targetPlayerId: string) {
  const rows = await tx.execute<{ firebaseUid: string }>(sql`
    SELECT firebase_uid AS "firebaseUid"
      FROM mobile_player_links
     WHERE player_id = ${targetPlayerId}
       AND is_primary
       AND revoked_at IS NULL
     ORDER BY linked_at
     LIMIT 1
  `);
  return rows[0]?.firebaseUid;
}

async function queueSocialNotification(
  tx: MobileDbTransaction,
  kind: "friend_request" | "party_invite",
  recipientFirebaseUid: string | undefined,
  payload: {
    title: string;
    body: string;
    deepLink: string;
    data: Record<string, string>;
  },
) {
  if (!recipientFirebaseUid) return;
  await tx.insert(mobileNotificationOutbox).values({
    kind,
    audience: { firebaseUid: recipientFirebaseUid },
    payload,
  });
}

export async function lookupExactPlayer(firebaseUid: string, name: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const found = await exactPlayer(tx, name);
    if (found.playerId === actor.playerId) {
      throw createError({ statusCode: 400, statusMessage: "Cannot target your own player" });
    }
    await assertUnblocked(tx, actor.playerId, found.playerId);
    return found;
  });
}

interface FriendshipRow extends Record<string, unknown> {
  requestedByPlayerId: string;
  status: "pending" | "accepted";
  createdAt: Date | string;
  updatedAt: Date | string;
  acceptedAt: Date | string | null;
}

export async function sendFriendRequest(firebaseUid: string, targetPlayerName: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const target = await exactPlayer(tx, targetPlayerName);
    const pair = await lockPlayerPair(tx, actor.playerId, target.playerId);
    await assertUnblocked(tx, actor.playerId, target.playerId);

    const rows = await tx.execute<FriendshipRow>(sql`
      SELECT requested_by_player_id AS "requestedByPlayerId",
             status,
             created_at AS "createdAt",
             updated_at AS "updatedAt",
             accepted_at AS "acceptedAt"
        FROM player_friendships
       WHERE player_low_id = ${pair.playerLowId}
         AND player_high_id = ${pair.playerHighId}
       FOR UPDATE
    `);
    const existing = rows[0];
    if (existing?.status === "accepted") throw conflict("Players are already friends");
    if (existing?.requestedByPlayerId === actor.playerId) {
      return {
        playerId: target.playerId,
        playerName: target.playerName,
        status: "pending" as const,
        createdAt: iso(existing.createdAt),
      };
    }
    if (existing?.status === "pending") {
      const accepted = await tx.execute<{ acceptedAt: Date | string }>(sql`
        UPDATE player_friendships
           SET status = 'accepted', accepted_at = now(), updated_at = now()
         WHERE player_low_id = ${pair.playerLowId}
           AND player_high_id = ${pair.playerHighId}
        RETURNING accepted_at AS "acceptedAt"
      `);
      return {
        playerId: target.playerId,
        playerName: target.playerName,
        status: "accepted" as const,
        acceptedAt: iso(accepted[0]!.acceptedAt),
      };
    }

    const inserted = await tx.execute<{ createdAt: Date | string }>(sql`
      INSERT INTO player_friendships
        (player_low_id, player_high_id, requested_by_player_id, status)
      VALUES (${pair.playerLowId}, ${pair.playerHighId}, ${actor.playerId}, 'pending')
      RETURNING created_at AS "createdAt"
    `);
    await queueSocialNotification(
      tx,
      "friend_request",
      await targetFirebaseUid(tx, target.playerId),
      {
        title: "New friend request",
        body: `${actor.playerName} sent you a friend request.`,
        deepLink: "cookiebuild://friends",
        data: { type: "friend_request", playerId: actor.playerId },
      },
    );
    return {
      playerId: target.playerId,
      playerName: target.playerName,
      status: "pending" as const,
      createdAt: iso(inserted[0]!.createdAt),
    };
  });
}

export async function acceptFriendRequest(firebaseUid: string, requesterPlayerId: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const requester = await playerById(tx, requesterPlayerId);
    const pair = await lockPlayerPair(tx, actor.playerId, requester.playerId);
    await assertUnblocked(tx, actor.playerId, requester.playerId);
    const updated = await tx.execute<{ acceptedAt: Date | string }>(sql`
      UPDATE player_friendships
         SET status = 'accepted', accepted_at = now(), updated_at = now()
       WHERE player_low_id = ${pair.playerLowId}
         AND player_high_id = ${pair.playerHighId}
         AND status = 'pending'
         AND requested_by_player_id = ${requester.playerId}
      RETURNING accepted_at AS "acceptedAt"
    `);
    if (!updated[0]) throw notFound("Incoming friend request not found");
    return {
      playerId: requester.playerId,
      playerName: requester.playerName,
      acceptedAt: iso(updated[0].acceptedAt),
    };
  });
}

export async function deleteFriendRequest(firebaseUid: string, otherPlayerId: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const pair = await lockPlayerPair(tx, actor.playerId, otherPlayerId);
    const deleted = await tx.execute(sql`
      DELETE FROM player_friendships
       WHERE player_low_id = ${pair.playerLowId}
         AND player_high_id = ${pair.playerHighId}
         AND status = 'pending'
      RETURNING player_low_id
    `);
    if (!deleted.length) throw notFound("Friend request not found");
    return { deleted: true };
  });
}

export async function removeFriend(firebaseUid: string, otherPlayerId: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const pair = await lockPlayerPair(tx, actor.playerId, otherPlayerId);
    const deleted = await tx.execute(sql`
      DELETE FROM player_friendships
       WHERE player_low_id = ${pair.playerLowId}
         AND player_high_id = ${pair.playerHighId}
         AND status = 'accepted'
      RETURNING player_low_id
    `);
    if (!deleted.length) throw notFound("Friend not found");
    await tx.execute(sql`
      DELETE FROM mobile_friend_online_alerts
       WHERE (owner_player_id = ${actor.playerId} AND target_player_id = ${otherPlayerId})
          OR (owner_player_id = ${otherPlayerId} AND target_player_id = ${actor.playerId})
    `);
    return { deleted: true };
  });
}

export async function friendsSnapshot(firebaseUid: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const friends = await tx.execute<{
      playerId: string;
      playerName: string | null;
      online: boolean;
      lastSeenAt: Date | string | null;
      onlineAlertEnabled: boolean;
    }>(sql`
      SELECT other.id AS "playerId",
             other.name AS "playerName",
             CASE WHEN NOT EXISTS (
               SELECT 1 FROM mobile_player_links privacy_link
               JOIN mobile_users privacy_user ON privacy_user.firebase_uid = privacy_link.firebase_uid AND privacy_user.deleted_at IS NULL
               JOIN mobile_notification_preferences privacy_pref ON privacy_pref.mobile_user_id = privacy_user.id
                WHERE privacy_link.player_id = other.id AND privacy_link.is_primary AND privacy_link.revoked_at IS NULL
                  AND privacy_pref.online_visibility = 'hidden'
             )
               THEN EXISTS (
                 SELECT 1 FROM player_sessions session
                  WHERE session.player_id = other.id AND session.end_time IS NULL
               ) ELSE false END AS online,
             CASE WHEN NOT EXISTS (
               SELECT 1 FROM mobile_player_links privacy_link
               JOIN mobile_users privacy_user ON privacy_user.firebase_uid = privacy_link.firebase_uid AND privacy_user.deleted_at IS NULL
               JOIN mobile_notification_preferences privacy_pref ON privacy_pref.mobile_user_id = privacy_user.id
                WHERE privacy_link.player_id = other.id AND privacy_link.is_primary AND privacy_link.revoked_at IS NULL
                  AND privacy_pref.online_visibility = 'hidden'
             ) THEN (
               SELECT max(coalesce(session.end_time, session.start_time))
                 FROM player_sessions session
                WHERE session.player_id = other.id
             ) ELSE NULL END AS "lastSeenAt",
             COALESCE(alert.enabled, false) AS "onlineAlertEnabled"
        FROM player_friendships friendship
        JOIN playerdata other
          ON other.id = CASE
            WHEN friendship.player_low_id = ${actor.playerId}
              THEN friendship.player_high_id
            ELSE friendship.player_low_id
          END
        LEFT JOIN mobile_friend_online_alerts alert
          ON alert.owner_player_id = ${actor.playerId} AND alert.target_player_id = other.id
       WHERE friendship.status = 'accepted'
         AND (${actor.playerId} IN (friendship.player_low_id, friendship.player_high_id))
       ORDER BY lower(other.name), other.id
    `);
    const pending = await tx.execute<{
      playerId: string;
      playerName: string | null;
      requestedByPlayerId: string;
      createdAt: Date | string;
    }>(sql`
      SELECT other.id AS "playerId",
             other.name AS "playerName",
             friendship.requested_by_player_id AS "requestedByPlayerId",
             friendship.created_at AS "createdAt"
        FROM player_friendships friendship
        JOIN playerdata other
          ON other.id = CASE
            WHEN friendship.player_low_id = ${actor.playerId}
              THEN friendship.player_high_id
            ELSE friendship.player_low_id
          END
       WHERE friendship.status = 'pending'
         AND (${actor.playerId} IN (friendship.player_low_id, friendship.player_high_id))
       ORDER BY friendship.created_at, other.id
    `);
    const request = (row: typeof pending[number]) => ({
      playerId: row.playerId,
      playerName: row.playerName ?? "Unknown player",
      createdAt: iso(row.createdAt),
    });
    return {
      player: actor,
      friends: friends.map((row) => ({
        playerId: row.playerId,
        playerName: row.playerName ?? "Unknown player",
        online: row.online,
        lastSeenAt: iso(row.lastSeenAt),
        onlineAlertEnabled: row.onlineAlertEnabled,
      })),
      incoming: pending.filter((row) => row.requestedByPlayerId !== actor.playerId).map(request),
      outgoing: pending.filter((row) => row.requestedByPlayerId === actor.playerId).map(request),
    };
  });
}

export async function blocksSnapshot(firebaseUid: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const rows = await tx.execute<{
      playerId: string;
      playerName: string | null;
      createdAt: Date | string;
    }>(sql`
      SELECT player.id AS "playerId",
             player.name AS "playerName",
             block.created_at AS "createdAt"
        FROM player_blocks block
        JOIN playerdata player ON player.id = block.blocked_player_id
       WHERE block.blocker_player_id = ${actor.playerId}
       ORDER BY block.created_at DESC, player.id
    `);
    return rows.map((row) => ({
      playerId: row.playerId,
      playerName: row.playerName ?? "Unknown player",
      createdAt: iso(row.createdAt),
    }));
  });
}

export async function blockPlayer(firebaseUid: string, targetPlayerId: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const target = await playerById(tx, targetPlayerId);
    const pair = await lockPlayerPair(tx, actor.playerId, target.playerId);
    const inserted = await tx.execute<{ createdAt: Date | string }>(sql`
      INSERT INTO player_blocks (blocker_player_id, blocked_player_id)
      VALUES (${actor.playerId}, ${target.playerId})
      ON CONFLICT (blocker_player_id, blocked_player_id)
      DO UPDATE SET created_at = player_blocks.created_at
      RETURNING created_at AS "createdAt"
    `);
    await tx.execute(sql`
      DELETE FROM player_friendships
       WHERE player_low_id = ${pair.playerLowId}
         AND player_high_id = ${pair.playerHighId}
    `);
    await tx.execute(sql`
      DELETE FROM mobile_friend_online_alerts
       WHERE (owner_player_id = ${actor.playerId} AND target_player_id = ${target.playerId})
          OR (owner_player_id = ${target.playerId} AND target_player_id = ${actor.playerId})
    `);
    await tx.execute(sql`
      UPDATE player_party_invites
         SET status = 'cancelled', responded_at = now()
       WHERE status = 'pending'
         AND (
           (inviter_player_id = ${actor.playerId} AND invitee_player_id = ${target.playerId})
           OR (inviter_player_id = ${target.playerId} AND invitee_player_id = ${actor.playerId})
         )
    `);
    // Blocking immediately separates the two players if they currently share a party. The leader
    // keeps the party; otherwise the blocker leaves. This update is idempotent and avoids exposing
    // future party presence after a safety action.
    await tx.execute(sql`
      WITH shared AS (
        SELECT actor.party_id, party.leader_player_id
          FROM player_party_members actor
          JOIN player_party_members target ON target.party_id = actor.party_id
          JOIN player_parties party ON party.id = actor.party_id AND party.state = 'active'
         WHERE actor.player_id = ${actor.playerId} AND actor.left_at IS NULL
           AND target.player_id = ${target.playerId} AND target.left_at IS NULL
         LIMIT 1
      )
      UPDATE player_party_members member
         SET left_at = now()
        FROM shared
       WHERE member.party_id = shared.party_id
         AND member.player_id = CASE
           WHEN shared.leader_player_id = ${actor.playerId} THEN ${target.playerId}::uuid
           ELSE ${actor.playerId}::uuid
         END
         AND member.left_at IS NULL
    `);
    return {
      playerId: target.playerId,
      playerName: target.playerName,
      createdAt: iso(inserted[0]!.createdAt),
    };
  });
}

export async function unblockPlayer(firebaseUid: string, targetPlayerId: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    await lockPlayerPair(tx, actor.playerId, targetPlayerId);
    const deleted = await tx.execute(sql`
      DELETE FROM player_blocks
       WHERE blocker_player_id = ${actor.playerId}
         AND blocked_player_id = ${targetPlayerId}
      RETURNING blocker_player_id
    `);
    if (!deleted.length) throw notFound("Blocked player not found");
    return { deleted: true };
  });
}

export async function reportPlayer(
  firebaseUid: string,
  targetPlayerId: string,
  reason: PlayerReportReason,
) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const target = await playerById(tx, targetPlayerId);
    await lockPlayerPair(tx, actor.playerId, target.playerId);
    const duplicates = await tx.execute(sql`
      SELECT 1 FROM player_reports
       WHERE reporter_player_id = ${actor.playerId}
         AND reported_player_id = ${target.playerId}
         AND reason = ${reason}
         AND created_at > now() - interval '24 hours'
       LIMIT 1
    `);
    if (duplicates.length) throw conflict("This issue was already reported recently");
    const recent = await tx.execute<{ count: number }>(sql`
      SELECT count(*)::int AS count
        FROM player_reports
       WHERE reporter_player_id = ${actor.playerId}
         AND created_at > now() - interval '1 hour'
    `);
    if ((recent[0]?.count ?? 0) >= 10) {
      throw createError({ statusCode: 429, statusMessage: "Too many reports" });
    }
    const inserted = await tx.execute<{
      id: string;
      createdAt: Date | string;
    }>(sql`
      INSERT INTO player_reports (reporter_player_id, reported_player_id, reason)
      VALUES (${actor.playerId}, ${target.playerId}, ${reason})
      RETURNING id, created_at AS "createdAt"
    `);
    return {
      id: inserted[0]!.id,
      playerId: target.playerId,
      playerName: target.playerName,
      reason,
      createdAt: iso(inserted[0]!.createdAt),
    };
  });
}

interface PartyRow extends Record<string, unknown> {
  id: string;
  leaderPlayerId: string;
  state: "active" | "disbanded";
}

async function activePartyForPlayer(tx: MobileDbTransaction, playerId: string, forUpdate = false) {
  const lock = forUpdate ? sql`FOR UPDATE OF party` : sql``;
  const rows = await tx.execute<PartyRow>(sql`
    SELECT party.id,
           party.leader_player_id AS "leaderPlayerId",
           party.state
      FROM player_party_members member
      JOIN player_parties party ON party.id = member.party_id
     WHERE member.player_id = ${playerId}
       AND member.left_at IS NULL
       AND party.state = 'active'
     LIMIT 1
     ${lock}
  `);
  return rows[0];
}

async function lockParty(tx: MobileDbTransaction, partyId: string) {
  const rows = await tx.execute<PartyRow>(sql`
    SELECT id, leader_player_id AS "leaderPlayerId", state
      FROM player_parties
     WHERE id = ${partyId}
     FOR UPDATE
  `);
  const party = rows[0];
  if (!party || party.state !== "active") throw notFound("Party not found");
  return party;
}

async function expirePartyInvites(tx: MobileDbTransaction, playerId: string) {
  await tx.execute(sql`
    UPDATE player_party_invites invite
       SET status = 'expired', responded_at = now()
     WHERE invite.status = 'pending'
       AND invite.expires_at <= now()
       AND (
         invite.invitee_player_id = ${playerId}
         OR invite.party_id IN (
           SELECT member.party_id
             FROM player_party_members member
            WHERE member.player_id = ${playerId} AND member.left_at IS NULL
         )
       )
  `);
}

async function assertPartyCompatible(
  tx: MobileDbTransaction,
  partyId: string,
  candidatePlayerId: string,
) {
  const rows = await tx.execute(sql`
    SELECT 1
      FROM player_party_members member
      JOIN player_blocks block
        ON (
          block.blocker_player_id = member.player_id
          AND block.blocked_player_id = ${candidatePlayerId}
        ) OR (
          block.blocker_player_id = ${candidatePlayerId}
          AND block.blocked_player_id = member.player_id
        )
     WHERE member.party_id = ${partyId}
       AND member.left_at IS NULL
     LIMIT 1
  `);
  if (rows.length) throw conflict("Player is unavailable");
}

export async function partySnapshot(firebaseUid: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    await expirePartyInvites(tx, actor.playerId);
    const party = await activePartyForPlayer(tx, actor.playerId);
    let current: null | {
      id: string;
      leaderPlayerId: string;
      members: Array<{
        playerId: string;
        playerName: string;
        role: "leader" | "member";
        online: boolean;
      }>;
      pendingInvites: Array<{
        id: string;
        playerId: string;
        playerName: string;
        expiresAt: string | null;
      }>;
    } = null;

    if (party) {
      const members = await tx.execute<{
        playerId: string;
        playerName: string | null;
        role: "leader" | "member";
        online: boolean;
      }>(sql`
        SELECT player.id AS "playerId",
               player.name AS "playerName",
               member.role,
               CASE WHEN NOT EXISTS (
                 SELECT 1 FROM mobile_player_links privacy_link
                 JOIN mobile_users privacy_user ON privacy_user.firebase_uid = privacy_link.firebase_uid AND privacy_user.deleted_at IS NULL
                 JOIN mobile_notification_preferences privacy_pref ON privacy_pref.mobile_user_id = privacy_user.id
                  WHERE privacy_link.player_id = player.id AND privacy_link.is_primary AND privacy_link.revoked_at IS NULL
                    AND privacy_pref.online_visibility = 'hidden'
               ) AND (NOT EXISTS (
                 SELECT 1 FROM mobile_player_links privacy_link
                 JOIN mobile_users privacy_user ON privacy_user.firebase_uid = privacy_link.firebase_uid AND privacy_user.deleted_at IS NULL
                 JOIN mobile_notification_preferences privacy_pref ON privacy_pref.mobile_user_id = privacy_user.id
                  WHERE privacy_link.player_id = player.id AND privacy_link.is_primary AND privacy_link.revoked_at IS NULL
                    AND privacy_pref.online_visibility = 'friends'
               ) OR EXISTS (
                 SELECT 1 FROM player_friendships friendship
                  WHERE friendship.status = 'accepted'
                    AND friendship.player_low_id = least(${actor.playerId}::uuid, player.id)
                    AND friendship.player_high_id = greatest(${actor.playerId}::uuid, player.id)
               )) THEN EXISTS (
                 SELECT 1 FROM player_sessions session
                  WHERE session.player_id = player.id AND session.end_time IS NULL
               ) ELSE false END AS online
          FROM player_party_members member
          JOIN playerdata player ON player.id = member.player_id
         WHERE member.party_id = ${party.id} AND member.left_at IS NULL
         ORDER BY CASE member.role WHEN 'leader' THEN 0 ELSE 1 END, member.joined_at, player.id
      `);
      const invites = party.leaderPlayerId === actor.playerId
        ? await tx.execute<{
            id: string;
            playerId: string;
            playerName: string | null;
            expiresAt: Date | string;
          }>(sql`
            SELECT invite.id,
                   player.id AS "playerId",
                   player.name AS "playerName",
                   invite.expires_at AS "expiresAt"
              FROM player_party_invites invite
              JOIN playerdata player ON player.id = invite.invitee_player_id
             WHERE invite.party_id = ${party.id}
               AND invite.status = 'pending'
               AND invite.expires_at > now()
             ORDER BY invite.created_at, invite.id
          `)
        : [];
      current = {
        id: party.id,
        leaderPlayerId: party.leaderPlayerId,
        members: members.map((row) => ({
          playerId: row.playerId,
          playerName: row.playerName ?? "Unknown player",
          role: row.role,
          online: row.online,
        })),
        pendingInvites: invites.map((row) => ({
          id: row.id,
          playerId: row.playerId,
          playerName: row.playerName ?? "Unknown player",
          expiresAt: iso(row.expiresAt),
        })),
      };
    }

    const incoming = await tx.execute<{
      id: string;
      partyId: string;
      leaderPlayerId: string;
      leaderPlayerName: string | null;
      expiresAt: Date | string;
    }>(sql`
      SELECT invite.id,
             party.id AS "partyId",
             party.leader_player_id AS "leaderPlayerId",
             leader.name AS "leaderPlayerName",
             invite.expires_at AS "expiresAt"
        FROM player_party_invites invite
        JOIN player_parties party ON party.id = invite.party_id AND party.state = 'active'
        JOIN playerdata leader ON leader.id = party.leader_player_id
       WHERE invite.invitee_player_id = ${actor.playerId}
         AND invite.status = 'pending'
         AND invite.expires_at > now()
       ORDER BY invite.created_at, invite.id
    `);
    return {
      party: current,
      incomingInvites: incoming.map((row) => ({
        id: row.id,
        partyId: row.partyId,
        leaderPlayerId: row.leaderPlayerId,
        leaderPlayerName: row.leaderPlayerName ?? "Unknown player",
        expiresAt: iso(row.expiresAt),
      })),
    };
  });
}

export async function createParty(firebaseUid: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    await lockPlayer(tx, actor.playerId);
    if (await activePartyForPlayer(tx, actor.playerId, true)) {
      throw conflict("Player is already in a party");
    }
    const rows = await tx.execute<{ id: string; createdAt: Date | string }>(sql`
      INSERT INTO player_parties (leader_player_id, state)
      VALUES (${actor.playerId}, 'active')
      RETURNING id, created_at AS "createdAt"
    `);
    const party = rows[0]!;
    await tx.execute(sql`
      INSERT INTO player_party_members (party_id, player_id, role)
      VALUES (${party.id}, ${actor.playerId}, 'leader')
    `);
    return {
      id: party.id,
      leaderPlayerId: actor.playerId,
      createdAt: iso(party.createdAt),
    };
  });
}

export async function inviteToParty(firebaseUid: string, targetPlayerName: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const partyRef = await activePartyForPlayer(tx, actor.playerId);
    if (!partyRef) throw notFound("Party not found");
    const target = await exactPlayer(tx, targetPlayerName);
    await lockPlayer(tx, target.playerId);
    const party = await lockParty(tx, partyRef.id);
    if (party.leaderPlayerId !== actor.playerId) {
      throw createError({ statusCode: 403, statusMessage: "Only the party leader can invite" });
    }
    await assertUnblocked(tx, actor.playerId, target.playerId);
    await assertPartyCompatible(tx, party.id, target.playerId);
    if (await activePartyForPlayer(tx, target.playerId)) {
      throw conflict("Player is already in a party");
    }
    const members = await tx.execute<{ count: number }>(sql`
      SELECT count(*)::int AS count
        FROM player_party_members
       WHERE party_id = ${party.id} AND left_at IS NULL
    `);
    if ((members[0]?.count ?? 0) >= PARTY_SIZE_LIMIT) throw conflict("Party is full");
    await tx.execute(sql`
      UPDATE player_party_invites
         SET status = 'expired', responded_at = now()
       WHERE party_id = ${party.id}
         AND invitee_player_id = ${target.playerId}
         AND status = 'pending'
         AND expires_at <= now()
    `);
    const existing = await tx.execute<{
      id: string;
      expiresAt: Date | string;
    }>(sql`
      SELECT id, expires_at AS "expiresAt"
        FROM player_party_invites
       WHERE party_id = ${party.id}
         AND invitee_player_id = ${target.playerId}
         AND status = 'pending'
       LIMIT 1
       FOR UPDATE
    `);
    if (existing[0]) {
      return {
        id: existing[0].id,
        playerId: target.playerId,
        playerName: target.playerName,
        expiresAt: iso(existing[0].expiresAt),
      };
    }
    const inserted = await tx.execute<{
      id: string;
      expiresAt: Date | string;
    }>(sql`
      INSERT INTO player_party_invites
        (party_id, inviter_player_id, invitee_player_id, status, expires_at)
      VALUES (
        ${party.id}, ${actor.playerId}, ${target.playerId}, 'pending',
        now() + make_interval(mins => ${PARTY_INVITE_MINUTES})
      )
      RETURNING id, expires_at AS "expiresAt"
    `);
    await queueSocialNotification(
      tx,
      "party_invite",
      await targetFirebaseUid(tx, target.playerId),
      {
        title: "Party invite",
        body: `${actor.playerName} invited you to their party.`,
        deepLink: "cookiebuild://party",
        data: { type: "party_invite", inviteId: inserted[0]!.id, partyId: party.id },
      },
    );
    return {
      id: inserted[0]!.id,
      playerId: target.playerId,
      playerName: target.playerName,
      expiresAt: iso(inserted[0]!.expiresAt),
    };
  });
}

export async function acceptPartyInvite(firebaseUid: string, inviteId: string) {
  const result = await db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const refs = await tx.execute<{ partyId: string }>(sql`
      SELECT party_id AS "partyId"
        FROM player_party_invites
       WHERE id = ${inviteId}
       LIMIT 1
    `);
    if (!refs[0]) throw notFound("Party invite not found");
    await lockPlayer(tx, actor.playerId);
    const party = await lockParty(tx, refs[0].partyId);
    const invites = await tx.execute<{
      inviterPlayerId: string;
      inviteePlayerId: string;
      expiresAt: Date | string;
      status: string;
    }>(sql`
      SELECT inviter_player_id AS "inviterPlayerId",
             invitee_player_id AS "inviteePlayerId",
             expires_at AS "expiresAt",
             status
        FROM player_party_invites
       WHERE id = ${inviteId} AND party_id = ${party.id}
       FOR UPDATE
    `);
    const invite = invites[0];
    if (!invite || invite.inviteePlayerId !== actor.playerId || invite.status !== "pending") {
      throw notFound("Party invite not found");
    }
    if (new Date(invite.expiresAt) <= new Date()) {
      await tx.execute(sql`
        UPDATE player_party_invites
           SET status = 'expired', responded_at = now()
         WHERE id = ${inviteId} AND status = 'pending'
      `);
      return { expired: true as const };
    }
    await assertUnblocked(tx, actor.playerId, invite.inviterPlayerId);
    await assertPartyCompatible(tx, party.id, actor.playerId);
    if (await activePartyForPlayer(tx, actor.playerId)) {
      throw conflict("Player is already in a party");
    }
    const members = await tx.execute<{ count: number }>(sql`
      SELECT count(*)::int AS count
        FROM player_party_members
       WHERE party_id = ${party.id} AND left_at IS NULL
    `);
    if ((members[0]?.count ?? 0) >= PARTY_SIZE_LIMIT) throw conflict("Party is full");

    await tx.execute(sql`
      INSERT INTO player_party_members (party_id, player_id, role, joined_at, left_at)
      VALUES (${party.id}, ${actor.playerId}, 'member', now(), NULL)
      ON CONFLICT (party_id, player_id)
      DO UPDATE SET role = 'member', joined_at = now(), left_at = NULL
    `);
    await tx.execute(sql`
      UPDATE player_party_invites
         SET status = 'accepted', responded_at = now()
       WHERE id = ${inviteId} AND status = 'pending'
    `);
    await tx.execute(sql`
      UPDATE player_party_invites
         SET status = 'cancelled', responded_at = now()
       WHERE invitee_player_id = ${actor.playerId}
         AND id <> ${inviteId}
         AND status = 'pending'
    `);
    await tx.execute(sql`
      UPDATE player_parties SET updated_at = now() WHERE id = ${party.id}
    `);
    return { partyId: party.id, joined: true };
  });
  if ("expired" in result) throw conflict("Party invite expired");
  return result;
}

export async function declineOrCancelPartyInvite(firebaseUid: string, inviteId: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const rows = await tx.execute<{
      partyId: string;
      inviterPlayerId: string;
      inviteePlayerId: string;
      leaderPlayerId: string;
      status: string;
    }>(sql`
      SELECT invite.party_id AS "partyId",
             invite.inviter_player_id AS "inviterPlayerId",
             invite.invitee_player_id AS "inviteePlayerId",
             party.leader_player_id AS "leaderPlayerId",
             invite.status
        FROM player_party_invites invite
        JOIN player_parties party ON party.id = invite.party_id
       WHERE invite.id = ${inviteId}
       LIMIT 1
       FOR UPDATE OF invite
    `);
    const invite = rows[0];
    if (!invite || invite.status !== "pending") throw notFound("Party invite not found");
    const declining = invite.inviteePlayerId === actor.playerId;
    const cancelling = invite.inviterPlayerId === actor.playerId || invite.leaderPlayerId === actor.playerId;
    if (!declining && !cancelling) {
      throw createError({ statusCode: 403, statusMessage: "Party invite is not yours" });
    }
    const status = declining ? "declined" : "cancelled";
    await tx.execute(sql`
      UPDATE player_party_invites
         SET status = ${status}, responded_at = now()
       WHERE id = ${inviteId} AND status = 'pending'
    `);
    return { deleted: true };
  });
}

export async function removePartyMember(firebaseUid: string, targetPlayerId: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const partyRef = await activePartyForPlayer(tx, actor.playerId);
    if (!partyRef) throw notFound("Party not found");
    await lockPlayer(tx, targetPlayerId);
    const party = await lockParty(tx, partyRef.id);
    if (targetPlayerId === party.leaderPlayerId) {
      throw conflict("Party leader must disband the party");
    }
    if (targetPlayerId !== actor.playerId && party.leaderPlayerId !== actor.playerId) {
      throw createError({ statusCode: 403, statusMessage: "Only the party leader can remove members" });
    }
    const updated = await tx.execute(sql`
      UPDATE player_party_members
         SET left_at = now()
       WHERE party_id = ${party.id}
         AND player_id = ${targetPlayerId}
         AND role = 'member'
         AND left_at IS NULL
      RETURNING player_id
    `);
    if (!updated.length) throw notFound("Party member not found");
    await tx.execute(sql`UPDATE player_parties SET updated_at = now() WHERE id = ${party.id}`);
    return { deleted: true };
  });
}

export async function disbandParty(firebaseUid: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const partyRef = await activePartyForPlayer(tx, actor.playerId);
    if (!partyRef) throw notFound("Party not found");
    await lockPlayer(tx, actor.playerId);
    const party = await lockParty(tx, partyRef.id);
    if (party.leaderPlayerId !== actor.playerId) {
      throw createError({ statusCode: 403, statusMessage: "Only the party leader can disband" });
    }
    await tx.execute(sql`
      UPDATE player_party_members SET left_at = now()
       WHERE party_id = ${party.id} AND left_at IS NULL
    `);
    await tx.execute(sql`
      UPDATE player_party_invites
         SET status = 'cancelled', responded_at = now()
       WHERE party_id = ${party.id} AND status = 'pending'
    `);
    await tx.execute(sql`
      UPDATE player_parties
         SET state = 'disbanded', disbanded_at = now(), updated_at = now()
       WHERE id = ${party.id} AND state = 'active'
    `);
    return { deleted: true };
  });
}
