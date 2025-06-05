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
          WHERE mw.player_id = playerdata.id
          AND mw.match_id IN (
            SELECT id FROM matches
            WHERE
              ${gamemode ? sql`gametype = ${gamemode}` : sql`TRUE`}
              AND ${
                period && period !== "all"
                  ? sql`starttime >= ${dateRange}`
                  : sql`TRUE`
              }
          )
        )`.as("wins"),
        losses: sql<number>`(
          SELECT COUNT(*)
          FROM match_players mp
          WHERE mp.player_id = playerdata.id
          AND mp.match_id IN (
            SELECT id FROM matches
            WHERE
              ${gamemode ? sql`gametype = ${gamemode}` : sql`TRUE`}
              AND ${
                period && period !== "all"
                  ? sql`starttime >= ${dateRange}`
                  : sql`TRUE`
              }
          )
          AND NOT EXISTS (
            SELECT 1 FROM match_winners mw
            WHERE mw.match_id = mp.match_id AND mw.player_id = playerdata.id
          )
        )`.as("losses"),
        playtime: playerdata.playtime,
      })
      .from(playerdata)
      .orderBy(sql`wins DESC`);

    return { data: stats };
  } catch (error) {
    console.error("Error fetching player stats:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
