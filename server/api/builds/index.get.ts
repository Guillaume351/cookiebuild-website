import { getQuery, setHeader } from "h3";
import { parseGalleryListQuery } from "../../buildbattle/query";
import { listGalleryBuilds } from "../../services/buildbattle-gallery";

/** GET /api/builds?sort=top|recent&period=week|month|all&limit=24&cursor=&player=&locale= */
export default defineEventHandler(async (event) => {
  const query = parseGalleryListQuery(getQuery(event));
  const data = await listGalleryBuilds(query);
  setHeader(event, "Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  return { data };
});
