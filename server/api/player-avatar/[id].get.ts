import { getQuery, getRouterParam, send, setHeader } from "h3";

const PLAYER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_SIZES = new Set([32, 48, 64, 96]);

export default defineEventHandler(async (event) => {
  const playerId = getRouterParam(event, "id") ?? "";
  if (!PLAYER_ID.test(playerId)) {
    throw createError({ statusCode: 404, statusMessage: "Avatar not found" });
  }
  const requestedSize = Number(getQuery(event).size);
  const size = ALLOWED_SIZES.has(requestedSize) ? requestedSize : 64;
  let response: Response;
  try {
    response = await fetch(`https://mc-heads.net/avatar/${encodeURIComponent(playerId)}/${size}`, {
      signal: AbortSignal.timeout(3_000),
      headers: { Accept: "image/png,image/jpeg" },
    });
  } catch {
    throw createError({ statusCode: 502, statusMessage: "Avatar provider unavailable" });
  }
  const contentType = response.headers.get("content-type")?.split(";", 1)[0];
  if (!response.ok || !contentType || !["image/png", "image/jpeg"].includes(contentType)) {
    throw createError({ statusCode: 404, statusMessage: "Avatar not found" });
  }
  const body = new Uint8Array(await response.arrayBuffer());
  if (body.byteLength === 0 || body.byteLength > 512 * 1024) {
    throw createError({ statusCode: 502, statusMessage: "Avatar response rejected" });
  }
  setHeader(event, "Content-Type", contentType);
  setHeader(event, "Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800");
  setHeader(event, "X-Content-Type-Options", "nosniff");
  return send(event, body);
});
