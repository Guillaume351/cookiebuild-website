import { createError, getHeader, getQuery, send, setHeader, setResponseStatus } from "h3";
import { routeShortCode } from "../../../buildbattle/handlers";
import { buildShareCard } from "../../../buildbattle/og-card";
import { BuildPayloadError } from "../../../buildbattle/payload";

/**
 * GET /api/builds/<code>/og.png?v=<likeCount>&locale= → 1200×630 PNG share card.
 * The URL from BuildSummary.ogImageUrl carries the like count, so a matching
 * `v` is immutable; any other request gets a shorter shared cache lifetime.
 */
export default defineEventHandler(async (event) => {
  const shortCode = routeShortCode(event);
  const query = getQuery(event);
  let card;
  try {
    card = await buildShareCard(shortCode, query.locale);
  } catch (error) {
    if (error instanceof BuildPayloadError) {
      console.error("[bb-gallery]", JSON.stringify({ event: "og_payload_invalid", shortCode, message: error.message }));
      throw createError({ statusCode: 422, statusMessage: "Build payload cannot be rendered" });
    }
    throw error;
  }
  const versioned = typeof query.v === "string" && query.v === String(card.likeCount);
  setHeader(event, "Content-Type", "image/png");
  setHeader(event, "ETag", card.etag);
  setHeader(event, "Cache-Control", versioned
    ? "public, max-age=31536000, immutable"
    : "public, max-age=600, stale-while-revalidate=86400");
  setHeader(event, "X-Content-Type-Options", "nosniff");
  const ifNoneMatch = getHeader(event, "if-none-match");
  if (ifNoneMatch && ifNoneMatch.split(",").some((value) => value.trim().replace(/^W\//, "") === card.etag)) {
    setResponseStatus(event, 304);
    return send(event, "");
  }
  setHeader(event, "Content-Length", card.png.byteLength);
  return send(event, card.png);
});
