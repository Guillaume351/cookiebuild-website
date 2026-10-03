import { setHeader } from "h3";
import { normalizeGalleryLocale } from "../../../../shared/buildbattle-gallery";
import { routeShortCode, queryLocale } from "../../../buildbattle/handlers";
import { optionalGalleryIdentity } from "../../../buildbattle/identity";
import { getGalleryBuild } from "../../../services/buildbattle-gallery";

/** GET /api/builds/<code> → BuildSummary & { liked } for the current cookie or app user. */
export default defineEventHandler(async (event) => {
  const shortCode = routeShortCode(event);
  const identity = await optionalGalleryIdentity(event);
  const data = await getGalleryBuild(shortCode, identity?.key ?? null, normalizeGalleryLocale(queryLocale(event)));
  setHeader(event, "Cache-Control", "private, no-store");
  return { data };
});
