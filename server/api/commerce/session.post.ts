import { readBody, setCookie } from "h3";
import { claimCommerceSession } from "../../services/commerce-session";
import { commerceSessionCookieName } from "../../utils/commerce-security";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ code?: unknown }>(event);
  const session = await claimCommerceSession(body?.code);
  setCookie(event, commerceSessionCookieName(), session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax is required for the top-level return from checkout.stripe.com.
    // Unsafe API routes remain protected by same-origin + double-submit CSRF.
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor((session.expiresAt.getTime() - Date.now()) / 1_000),
  });
  setHeader(event, "Cache-Control", "no-store");
  return { data: { player: { id: session.playerId, name: session.playerName }, expiresAt: session.expiresAt.toISOString() } };
});
