import { sql } from "drizzle-orm";
import { createError } from "h3";
import db from "../../db/client";
import type { PlayerRallyResponse } from "../utils/mobile-rallies";
import { requirePrimaryLinkedPlayer } from "./mobile-social";
import type { MobileDbTransaction } from "./mobile-user";

type PlayerRallySource = "login" | "player" | "automatic";

interface RallyRow extends Record<string, unknown> {
  id: string;
  targetPlayerId: string;
  targetPlayerName: string | null;
  source: PlayerRallySource;
  gamemode: string;
  expiresAt: Date | string;
  expired: boolean;
}

interface ResponseRow extends Record<string, unknown> {
  response: PlayerRallyResponse;
}

export interface PlayerRallyView {
  id: string;
  source: PlayerRallySource;
  gamemode: string;
  targetPlayerName: string;
  expiresAt: string;
  response: PlayerRallyResponse | null;
}

function rallyNotFound() {
  return createError({ statusCode: 404, statusMessage: "Player rally not found" });
}

function rallyExpired() {
  return createError({ statusCode: 410, statusMessage: "Player rally expired" });
}

function responseConflict(statusMessage: string) {
  return createError({ statusCode: 409, statusMessage });
}

function iso(value: Date | string) {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function view(row: RallyRow, response: PlayerRallyResponse | null): PlayerRallyView {
  return {
    id: row.id,
    source: row.source,
    gamemode: row.gamemode,
    targetPlayerName: row.targetPlayerName ?? "Unknown player",
    expiresAt: iso(row.expiresAt),
    response,
  };
}

async function loadVisibleRally(
  tx: MobileDbTransaction,
  rallyId: string,
  responderPlayerId: string,
  lock: boolean,
) {
  const lockClause = lock ? sql`FOR UPDATE OF rally` : sql``;
  const rows = await tx.execute<RallyRow>(sql`
    SELECT rally.id,
           rally.target_player_id AS "targetPlayerId",
           target.name AS "targetPlayerName",
           rally.source,
           rally.gamemode,
           rally.expires_at AS "expiresAt",
           rally.expires_at <= now() AS expired
      FROM player_rallies rally
      JOIN playerdata target ON target.id = rally.target_player_id
     WHERE rally.id = ${rallyId}
       AND NOT EXISTS (
         SELECT 1
           FROM player_blocks block
          WHERE (block.blocker_player_id = rally.target_player_id
                 AND block.blocked_player_id = ${responderPlayerId})
             OR (block.blocker_player_id = ${responderPlayerId}
                 AND block.blocked_player_id = rally.target_player_id)
       )
     ${lockClause}
  `);
  const rally = rows[0];
  if (!rally) throw rallyNotFound();
  if (rally.expired) throw rallyExpired();
  return rally;
}

async function currentResponse(
  tx: MobileDbTransaction,
  rallyId: string,
  responderPlayerId: string,
) {
  const rows = await tx.execute<ResponseRow>(sql`
    SELECT response
      FROM player_rally_responses
     WHERE rally_id = ${rallyId}
       AND responder_player_id = ${responderPlayerId}
     LIMIT 1
  `);
  return rows[0]?.response ?? null;
}

export async function getPlayerRally(firebaseUid: string, rallyId: string) {
  return db.transaction(async (tx) => {
    const responder = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const rally = await loadVisibleRally(tx, rallyId, responder.playerId, false);
    return view(rally, await currentResponse(tx, rally.id, responder.playerId));
  });
}

export async function respondToPlayerRally(
  firebaseUid: string,
  rallyId: string,
  response: PlayerRallyResponse,
) {
  return db.transaction(async (tx) => {
    const responder = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const rally = await loadVisibleRally(tx, rallyId, responder.playerId, true);
    if (rally.targetPlayerId === responder.playerId) {
      throw responseConflict("Cannot respond to your own player rally");
    }

    const existing = await currentResponse(tx, rally.id, responder.playerId);
    if (existing) {
      if (existing !== response) {
        throw responseConflict("Player rally response already recorded");
      }
      return { data: view(rally, existing), created: false };
    }

    const inserted = await tx.execute<Record<string, unknown>>(sql`
      INSERT INTO player_rally_responses (rally_id, responder_player_id, response)
      SELECT id, ${responder.playerId}, ${response}
        FROM player_rallies
       WHERE id = ${rally.id}
         AND expires_at > now()
      RETURNING id
    `);
    if (!inserted.length) throw rallyExpired();
    return { data: view(rally, response), created: true };
  });
}
