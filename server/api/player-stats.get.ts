import { sql } from "drizzle-orm";
import { getQuery } from "h3";
import db from "../../db/client";
import { playerdata } from "../../db/schema";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const gamemode = query.gamemode as string | undefined;
    const period = query.period as string | undefined; // 'week', 'month', 'all'

    let dateRange: string | undefined;
    if (period && period !== "all") {
      const now = new Date();
      if (period === "week") {
        dateRange = new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000
        ).toISOString();
      } else if (period === "month") {
        dateRange = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate()
        ).toISOString();
      }
    }

    const stats = await db
      .select({
        id: playerdata.id,
        name: playerdata.name,
        wins: sql<number>`(
          SELECT COUNT(*)
          FROM match_winners mw
          JOIN matches m ON mw.match_id = m.id
          WHERE mw.player_id = playerdata.id
          AND (${gamemode ? sql`m.gametype = ${gamemode}` : sql`TRUE`})
          AND (${
            period && period !== "all"
              ? sql`m.starttime >= ${dateRange}`
              : sql`TRUE`
          })
        )`.as("wins"),
        losses: sql<number>`(
          SELECT COUNT(*)
          FROM match_players mp
          JOIN matches m ON mp.match_id = m.id
          WHERE mp.player_id = playerdata.id
          AND (${gamemode ? sql`m.gametype = ${gamemode}` : sql`TRUE`})
          AND (${
            period && period !== "all"
              ? sql`m.starttime >= ${dateRange}`
              : sql`TRUE`
          })
          AND NOT EXISTS (
            SELECT 1 FROM match_winners mw_loss
            WHERE mw_loss.match_id = mp.match_id AND mw_loss.player_id = playerdata.id
          )
        )`.as("losses"),
        playtime: sql<number>`COALESCE(
          (
            SELECT SUM(
              CASE
                WHEN ps.end_time IS NULL AND ps.server_crash = TRUE THEN
                  EXTRACT(EPOCH FROM (NOW() - ps.start_time)) * 1000
                ELSE ps.duration
              END
            )
            FROM player_sessions ps
            WHERE ps.player_id = playerdata.id
            AND (${
              period && period !== "all"
                ? sql`ps.start_time >= ${dateRange}`
                : sql`TRUE`
            })
          ), 0
        )`.as("playtime"),
      })
      .from(playerdata)
      .orderBy(sql`wins DESC, playtime DESC`);

    return { data: stats };
  } catch (error) {
    console.error("Error fetching player stats:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
