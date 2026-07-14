import { getQuery } from "h3";
import { loadPlayerStats } from "../../player-stats.get";

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as Record<string, unknown>;
  const result = await loadPlayerStats({ ...query, pageSize: query.pageSize ?? 25 });
  setHeader(event, "Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120");
  return result;
});
