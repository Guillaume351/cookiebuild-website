import { requireCommerceAuth } from "../../services/commerce-session";

export default defineEventHandler((event) => {
  const auth = requireCommerceAuth(event);
  setHeader(event, "Cache-Control", "no-store");
  return { data: { player: { id: auth.playerId, name: auth.playerName }, expiresAt: auth.expiresAt.toISOString() } };
});
