import { gunzipSync } from "node:zlib";
import { getHeader, send, setHeader, setResponseStatus } from "h3";
import { routeShortCode } from "../../../buildbattle/handlers";
import { getGalleryBuildBlocks } from "../../../services/buildbattle-gallery";

const IMMUTABLE = "public, max-age=31536000, immutable";

/**
 * GET /api/builds/<code>/blocks → the stored gzip JSON payload, byte for byte,
 * with Content-Encoding: gzip. Captures never change, so the response is immutable.
 */
export default defineEventHandler(async (event) => {
  const shortCode = routeShortCode(event);
  const { id, data } = await getGalleryBuildBlocks(shortCode);
  const etag = `"bb-${id}"`;
  setHeader(event, "ETag", etag);
  setHeader(event, "Cache-Control", IMMUTABLE);
  setHeader(event, "Vary", "Accept-Encoding");
  setHeader(event, "Content-Type", "application/json; charset=utf-8");
  setHeader(event, "X-Content-Type-Options", "nosniff");
  const ifNoneMatch = getHeader(event, "if-none-match");
  if (ifNoneMatch && ifNoneMatch.split(",").some((value) => value.trim().replace(/^W\//, "") === etag)) {
    setResponseStatus(event, 304);
    return send(event, "");
  }
  const acceptEncoding = getHeader(event, "accept-encoding") ?? "";
  if (/\bgzip\b/i.test(acceptEncoding) || !acceptEncoding) {
    setHeader(event, "Content-Encoding", "gzip");
    setHeader(event, "Content-Length", data.byteLength);
    return send(event, data);
  }
  // Rare clients that refuse gzip get the identity payload.
  const json = gunzipSync(data, { maxOutputLength: 8 * 1024 * 1024 });
  setHeader(event, "Content-Length", json.byteLength);
  return send(event, json);
});
