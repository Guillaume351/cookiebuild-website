import { eq, sql } from "drizzle-orm";
import { createError } from "h3";
import db from "../../db/client";
import { playerdata } from "../../db/schema";
export function normalizeRecipientQuery(value: unknown) {
  if (typeof value !== "string") return "";
  const query = value.trim().replace(/^\./, "").replace(/ /g, "_");
  return /^[a-zA-Z0-9_]{2,16}$/.test(query) ? query.toLowerCase() : "";
}
const seenPlayer = sql`EXISTS (SELECT 1 FROM player_sessions ps WHERE ps.player_id = ${playerdata.id})`;
export async function lookupCommerceRecipients(value: unknown) {
  const query = normalizeRecipientQuery(value);
  if (!query) return [];
  const players = await db.select({ id: playerdata.id, name: playerdata.name }).from(playerdata).where(sql`
    ${seenPlayer} AND left(lower(replace(ltrim(${playerdata.name}, '.'), ' ', '_')), ${query.length}) = ${query}
  `).orderBy(playerdata.name).limit(8);
  return players.map(player => ({ ...player, edition: (player.name?.startsWith(".") || player.id.startsWith("00000000-0000-0000-")) ? "bedrock" as const : "java" as const }));
}
export async function requireCommerceRecipient(id: unknown) {
  if (typeof id !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) throw createError({ statusCode: 400, statusMessage: "Select a known recipient" });
  const [player] = await db.select({ id: playerdata.id, name: playerdata.name }).from(playerdata).where(sql`${eq(playerdata.id, id)} AND ${seenPlayer}`).limit(1);
  if (!player) throw createError({ statusCode: 400, statusMessage: "Select a player who has joined Cookie Build" });
  return player;
}
