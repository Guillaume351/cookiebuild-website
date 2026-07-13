import { sql } from "drizzle-orm";
import db from "../../db/client";

export default defineEventHandler(async (event) => {
  const startedAt = performance.now();
  try {
    await db.execute(sql`SELECT 1 AS health`);
    setHeader(event, "Cache-Control", "no-store, max-age=0");
    return {
      ok: true,
      database: true,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    console.error("Database health check failed:", error);
    throw createError({ statusCode: 503, statusMessage: "Database unavailable" });
  }
});
