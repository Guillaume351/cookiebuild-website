import { eq, sql } from "drizzle-orm";
import db from "../../db/client";
import { playerdata, playerMatchPerformances } from "../../db/schema";

export default defineEventHandler(async (event) => {
  try {
    const stats = await db
      .select({
        id: playerdata.id,
        name: playerdata.name,
        kills:
          sql<number>`COALESCE(SUM(${playerMatchPerformances.killsinmatch}), 0)`.as(
            "kills"
          ),
        deaths:
          sql<number>`COALESCE(SUM(${playerMatchPerformances.deathsinmatch}), 0)`.as(
            "deaths"
          ),
        assists:
          sql<number>`COALESCE(SUM(${playerMatchPerformances.assistsinmatch}), 0)`.as(
            "assists"
          ),
        playtime: playerdata.playtime,
      })
      .from(playerdata)
      .leftJoin(
        playerMatchPerformances,
        eq(playerdata.id, playerMatchPerformances.playerId)
      )
      .groupBy(playerdata.id, playerdata.name, playerdata.playtime)
      .orderBy(sql`kills DESC`);

    return { data: stats };
  } catch (error) {
    console.error("Error fetching player stats:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
