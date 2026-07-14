import { and, count, ilike, sql } from "drizzle-orm";
import { getQuery } from "h3";
import db from "../../db/client";
import { playerdata } from "../../db/schema";

const PROGRESSION_GAMEMODES = new Map([
  ["MicroBattles", "microbattles"],
  ["Pitchout", "pitchout"],
  ["SkyWars", "skywars"],
]);
const OUTER_PLAYER_ID = sql.raw('"playerdata"."id"');

function positiveInteger(value: unknown, fallback: number, maximum: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function beginningOfPeriod(period: string | undefined) {
  const now = new Date();
  if (period === "season") {
    const quarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
    return new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1)).toISOString();
  }
  if (period === "month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  }
  if (period === "week") {
    const day = now.getUTCDay() || 7;
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1),
    ).toISOString();
  }
  return undefined;
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const requestedGamemode = String(query.gamemode ?? "");
    const progressionGamemode = PROGRESSION_GAMEMODES.get(requestedGamemode);
    const gamemode = progressionGamemode ? requestedGamemode : undefined;
    const period = ["week", "month", "season"].includes(String(query.period))
      ? String(query.period)
      : undefined;
    const search = String(query.search ?? "").trim().slice(0, 32);
    const page = positiveInteger(query.page, 1, 100_000);
    const pageSize = positiveInteger(query.pageSize, 10, 50);
    const offset = (page - 1) * pageSize;
    const dateRange = beginningOfPeriod(period);
    const playerFilter = search ? ilike(playerdata.name, `%${search}%`) : undefined;
    const participationFilter = gamemode || dateRange
      ? sql<boolean>`EXISTS (
          SELECT 1
          FROM match_players mp_filter
          JOIN matches m_filter ON mp_filter.match_id = m_filter.id
          WHERE mp_filter.player_id = ${OUTER_PLAYER_ID}
          AND m_filter.endtime IS NOT NULL
          AND (${gamemode ? sql`m_filter.gametype = ${gamemode}` : sql`TRUE`})
          AND (${dateRange ? sql`m_filter.starttime >= ${dateRange}` : sql`TRUE`})
        )`
      : undefined;
    const leaderboardFilter = and(playerFilter, participationFilter);

    const totals = await db
      .select({ total: count() })
      .from(playerdata)
      .where(leaderboardFilter);
    const total = Number(totals[0]?.total ?? 0);

    const stats = await db
      .select({
        id: playerdata.id,
        name: playerdata.name,
        coins: playerdata.coins,
        wins: sql<number>`(
          SELECT COUNT(*)
          FROM match_winners mw
          JOIN matches m ON mw.match_id = m.id
          WHERE mw.player_id = ${OUTER_PLAYER_ID}
          AND m.endtime IS NOT NULL
          AND (${gamemode ? sql`m.gametype = ${gamemode}` : sql`TRUE`})
          AND (${dateRange ? sql`m.starttime >= ${dateRange}` : sql`TRUE`})
        )`.as("wins"),
        losses: sql<number>`(
          SELECT COUNT(*)
          FROM match_players mp
          JOIN matches m ON mp.match_id = m.id
          WHERE mp.player_id = ${OUTER_PLAYER_ID}
          AND m.endtime IS NOT NULL
          AND (${gamemode ? sql`m.gametype = ${gamemode}` : sql`TRUE`})
          AND (${dateRange ? sql`m.starttime >= ${dateRange}` : sql`TRUE`})
          AND NOT EXISTS (
            SELECT 1 FROM match_winners mw_loss
            WHERE mw_loss.match_id = mp.match_id AND mw_loss.player_id = ${OUTER_PLAYER_ID}
          )
        )`.as("losses"),
        matches: sql<number>`(
          SELECT COUNT(*)
          FROM match_players mp
          JOIN matches m ON mp.match_id = m.id
          WHERE mp.player_id = ${OUTER_PLAYER_ID}
          AND m.endtime IS NOT NULL
          AND (${gamemode ? sql`m.gametype = ${gamemode}` : sql`TRUE`})
          AND (${dateRange ? sql`m.starttime >= ${dateRange}` : sql`TRUE`})
        )`.as("matches"),
        kills: sql<number>`COALESCE((
          SELECT SUM(pmp.killsinmatch)
          FROM player_match_performances pmp
          JOIN matches m ON pmp.match_id = m.id
          WHERE pmp.player_id = ${OUTER_PLAYER_ID}
          AND m.endtime IS NOT NULL
          AND (${gamemode ? sql`m.gametype = ${gamemode}` : sql`TRUE`})
          AND (${dateRange ? sql`m.starttime >= ${dateRange}` : sql`TRUE`})
        ), 0)`.as("kills"),
        deaths: sql<number>`COALESCE((
          SELECT SUM(pmp.deathsinmatch)
          FROM player_match_performances pmp
          JOIN matches m ON pmp.match_id = m.id
          WHERE pmp.player_id = ${OUTER_PLAYER_ID}
          AND m.endtime IS NOT NULL
          AND (${gamemode ? sql`m.gametype = ${gamemode}` : sql`TRUE`})
          AND (${dateRange ? sql`m.starttime >= ${dateRange}` : sql`TRUE`})
        ), 0)`.as("deaths"),
        playtime: (gamemode
          ? sql<number>`COALESCE((
              SELECT SUM(EXTRACT(EPOCH FROM (m_play.endtime - m_play.starttime)) * 1000)
              FROM match_players mp_play
              JOIN matches m_play ON mp_play.match_id = m_play.id
              WHERE mp_play.player_id = ${OUTER_PLAYER_ID}
              AND m_play.endtime IS NOT NULL
              AND m_play.gametype = ${gamemode}
              AND (${dateRange ? sql`m_play.starttime >= ${dateRange}` : sql`TRUE`})
            ), 0)`
          : sql<number>`COALESCE((
              SELECT SUM(
                CASE
                  WHEN ps.duration IS NOT NULL THEN ps.duration
                  WHEN ps.end_time IS NOT NULL THEN EXTRACT(EPOCH FROM (ps.end_time - ps.start_time)) * 1000
                  ELSE EXTRACT(EPOCH FROM (NOW() - ps.start_time)) * 1000
                END
              )
              FROM player_sessions ps
              WHERE ps.player_id = ${OUTER_PLAYER_ID}
              AND (${dateRange ? sql`ps.start_time >= ${dateRange}` : sql`TRUE`})
            ), 0)`).as("playtime"),
        lastMatchAt: sql<string | null>`(
          SELECT MAX(m.endtime)
          FROM match_players mp
          JOIN matches m ON mp.match_id = m.id
          WHERE mp.player_id = ${OUTER_PLAYER_ID}
          AND m.endtime IS NOT NULL
          AND (${gamemode ? sql`m.gametype = ${gamemode}` : sql`TRUE`})
        )`.as("lastMatchAt"),
        progression: sql<Array<{
          minigame: string;
          level: number;
          experience: number;
          selectedKit: string | null;
          selectedKitLevel: number;
        }>>`COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'minigame', mp.minigame,
            'level', mp.level,
            'experience', mp.experience,
            'selectedKit', mp.last_selected_kit_name,
            'selectedKitLevel', mp.last_selected_kit_level
          ) ORDER BY mp.minigame)
          FROM minigame_progression mp
          WHERE mp.player_id = ${OUTER_PLAYER_ID}
          AND (${progressionGamemode ? sql`mp.minigame = ${progressionGamemode}` : sql`TRUE`})
        ), '[]'::jsonb)`.as("progression"),
      })
      .from(playerdata)
      .where(leaderboardFilter)
      .orderBy(sql`wins DESC, matches DESC, playtime DESC, ${playerdata.name} ASC`)
      .limit(pageSize)
      .offset(offset);

    setHeader(event, "Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120");

    return {
      data: stats,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  } catch (error) {
    console.error("Error fetching player stats:", error);
    throw createError({ statusCode: 500, statusMessage: "Unable to load player statistics" });
  }
});
