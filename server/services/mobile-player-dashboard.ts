import { sql } from "drizzle-orm";
import db from "../../db/client";
import { primaryLinkedPlayer } from "./mobile-engagement";

interface PlayerRow extends Record<string, unknown> {
  playerId: string;
  playerName: string | null;
  edition: "java" | "bedrock";
  online: boolean;
  coins: number;
}

interface SummaryRow extends Record<string, unknown> {
  id: string;
  name: string;
  matches: number;
  wins: number;
  kills: number;
  deaths: number;
  playtimeMs: number;
  level: number | null;
  experience: number | null;
  selectedKitName: string | null;
  selectedKitLevel: number | null;
}

interface ActivityRow extends Record<string, unknown> {
  day: string;
  gamemode: string;
  matches: number;
}

interface MatchRow extends Record<string, unknown> {
  id: string;
  gamemode: string;
  startedAt: Date | string;
  endedAt: Date | string;
  durationMs: number;
  won: boolean;
  kills: number;
  deaths: number;
  assists: number;
}

const gamemodeValues = sql.raw(`
  ('microbattles', 'MicroBattles'),
  ('pitchout', 'Pitchout'),
  ('skywars', 'SkyWars'),
  ('buildbattles', 'BuildBattles'),
  ('turfwars', 'TurfWars'),
  ('bedwars', 'BedWars')
`);

/** Private linked-player overview used by the app's compact Stats submenu. */
export async function mobilePlayerDashboard(firebaseUid: string) {
  return db.transaction(async (tx) => {
    const actor = await primaryLinkedPlayer(tx, firebaseUid);
    const players = await tx.execute<PlayerRow>(sql`
      SELECT player.id AS "playerId",
             player.name AS "playerName",
             link.edition,
             player.coins,
             EXISTS (
               SELECT 1 FROM player_sessions session
                WHERE session.player_id = player.id AND session.end_time IS NULL
             ) AS online
        FROM mobile_player_links link
        JOIN playerdata player ON player.id = link.player_id
       WHERE link.firebase_uid = ${firebaseUid}
         AND link.player_id = ${actor.playerId}
         AND link.is_primary
         AND link.revoked_at IS NULL
       LIMIT 1
    `);
    const player = players[0]!;

    const summaries = await tx.execute<SummaryRow>(sql`
      WITH supported_games(id, name) AS (VALUES ${gamemodeValues}),
      player_matches AS MATERIALIZED (
        SELECT match.id,
               match.gametype,
               match.starttime,
               match.endtime,
               (winner.match_id IS NOT NULL) AS won,
               COALESCE(performance.killsinmatch, 0)::int AS kills,
               COALESCE(performance.deathsinmatch, 0)::int AS deaths
          FROM match_players participant
          JOIN matches match ON match.id = participant.match_id AND match.endtime IS NOT NULL
          LEFT JOIN match_winners winner
            ON winner.match_id = match.id AND winner.player_id = participant.player_id
          LEFT JOIN player_match_performances performance
            ON performance.match_id = match.id AND performance.player_id = participant.player_id
         WHERE participant.player_id = ${actor.playerId}
      )
      SELECT game.id,
             game.name,
             count(match.id)::int AS matches,
             count(match.id) FILTER (WHERE match.won)::int AS wins,
             COALESCE(sum(match.kills), 0)::int AS kills,
             COALESCE(sum(match.deaths), 0)::int AS deaths,
             COALESCE(sum(extract(epoch FROM (match.endtime - match.starttime)) * 1000), 0)::bigint AS "playtimeMs",
             progression.level,
             progression.experience,
             progression.last_selected_kit_name AS "selectedKitName",
             progression.last_selected_kit_level AS "selectedKitLevel"
        FROM supported_games game
        LEFT JOIN player_matches match ON match.gametype = game.name
        LEFT JOIN minigame_progression progression
          ON progression.player_id = ${actor.playerId} AND progression.minigame = game.id
       GROUP BY game.id, game.name, progression.level, progression.experience,
                progression.last_selected_kit_name, progression.last_selected_kit_level
       ORDER BY game.name
    `);

    const activity = await tx.execute<ActivityRow>(sql`
      WITH supported_games(id, name) AS (VALUES ${gamemodeValues}),
      utc_days(day) AS (
        SELECT generate_series(
          (now() AT TIME ZONE 'UTC')::date - 29,
          (now() AT TIME ZONE 'UTC')::date,
          interval '1 day'
        )::date
      ),
      player_activity AS MATERIALIZED (
        SELECT (match.starttime AT TIME ZONE 'UTC')::date AS day,
               match.gametype,
               count(*)::int AS matches
          FROM match_players participant
          JOIN matches match ON match.id = participant.match_id
         WHERE participant.player_id = ${actor.playerId}
           AND match.endtime IS NOT NULL
           AND match.starttime >= (now() AT TIME ZONE 'UTC')::date - 29
           AND match.starttime < (now() AT TIME ZONE 'UTC')::date + 1
         GROUP BY (match.starttime AT TIME ZONE 'UTC')::date, match.gametype
      )
      SELECT day.day::text AS day,
             game.id AS gamemode,
             COALESCE(activity.matches, 0)::int AS matches
        FROM utc_days day
        CROSS JOIN supported_games game
        LEFT JOIN player_activity activity
          ON activity.day = day.day AND activity.gametype = game.name
       ORDER BY day.day, game.id
    `);

    const history = await tx.execute<MatchRow>(sql`
      WITH supported_games(id, name) AS (VALUES ${gamemodeValues}),
      ranked_history AS (
        SELECT match.id,
               game.id AS gamemode,
               match.starttime AS "startedAt",
               match.endtime AS "endedAt",
               (extract(epoch FROM (match.endtime - match.starttime)) * 1000)::bigint AS "durationMs",
               (winner.match_id IS NOT NULL) AS won,
               COALESCE(performance.killsinmatch, 0)::int AS kills,
               COALESCE(performance.deathsinmatch, 0)::int AS deaths,
               COALESCE(performance.assistsinmatch, 0)::int AS assists,
               row_number() OVER (
                 PARTITION BY game.id ORDER BY match.endtime DESC, match.id
               ) AS mode_row
          FROM match_players participant
          JOIN matches match ON match.id = participant.match_id AND match.endtime IS NOT NULL
          JOIN supported_games game ON game.name = match.gametype
          LEFT JOIN match_winners winner
            ON winner.match_id = match.id AND winner.player_id = participant.player_id
          LEFT JOIN player_match_performances performance
            ON performance.match_id = match.id AND performance.player_id = participant.player_id
         WHERE participant.player_id = ${actor.playerId}
      )
      SELECT id, gamemode, "startedAt", "endedAt", "durationMs", won, kills, deaths, assists
        FROM ranked_history
       WHERE mode_row <= 15
       ORDER BY "endedAt" DESC, id
    `);

    return {
      player: {
        playerId: player.playerId,
        playerName: player.playerName ?? actor.playerName,
        edition: player.edition,
        online: player.online,
        coins: Number(player.coins),
      },
      gamemodes: summaries.map((row) => ({
        id: row.id,
        name: row.name,
        matches: Number(row.matches),
        wins: Number(row.wins),
        kills: Number(row.kills),
        deaths: Number(row.deaths),
        playtimeMs: Number(row.playtimeMs),
        level: Math.max(1, Number(row.level ?? 1)),
        experience: Math.max(0, Number(row.experience ?? 0)),
        selectedKitName: row.selectedKitName,
        selectedKitLevel: Number(row.selectedKitLevel ?? 0),
      })),
      activity: activity.map((row) => ({
        day: row.day,
        gamemode: row.gamemode,
        matches: Number(row.matches),
      })),
      history: history.map((row) => ({
        id: row.id,
        gamemode: row.gamemode,
        startedAt: new Date(row.startedAt).toISOString(),
        endedAt: new Date(row.endedAt).toISOString(),
        durationMs: Number(row.durationMs),
        result: row.won ? "win" : "loss",
        kills: Number(row.kills),
        deaths: Number(row.deaths),
        assists: Number(row.assists),
      })),
    };
  });
}
