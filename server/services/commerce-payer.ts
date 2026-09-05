import { and, eq, gt, isNull, or } from "drizzle-orm";
import { createError, getCookie, setCookie, type H3Event } from "h3";
import db from "../../db/client";
import { commerceGuestPayers, commerceOrders } from "../../db/schema";
import { verifyCommerceSession, type CommerceAuthContext } from "./commerce-session";
import { createCommerceToken, hashCommerceToken, validCommerceToken } from "../utils/commerce-security";

export type CommercePayer = CommerceAuthContext | { guestId: string; expiresAt: Date };
export const guestCookieName = () => process.env.NODE_ENV === "production" ? "__Host-cookiebuild_payer" : "cookiebuild_payer";
const DURATION = 30 * 24 * 60 * 60_000;
export function payerOwnsOrder(payer: CommercePayer, order: { playerId: string; payerPlayerId: string | null; payerGuestId: string | null }) {
  return "guestId" in payer ? order.payerGuestId === payer.guestId
    : !order.payerGuestId && (order.payerPlayerId || order.playerId) === payer.playerId;
}
export function payerOrderFilter(payer: CommercePayer) {
  return "guestId" in payer ? eq(commerceOrders.payerGuestId, payer.guestId) : and(
    isNull(commerceOrders.payerGuestId), or(eq(commerceOrders.payerPlayerId, payer.playerId),
      and(isNull(commerceOrders.payerPlayerId), eq(commerceOrders.playerId, payer.playerId))));
}
export async function resolveCommercePayer(event: H3Event, create = false, now = new Date()): Promise<CommercePayer> {
  // An existing guest capability remains the billing identity even after a player is linked.
  const token = getCookie(event, guestCookieName());
  if (validCommerceToken(token)) {
    const [guest] = await db.select().from(commerceGuestPayers).where(and(
      eq(commerceGuestPayers.tokenHash, hashCommerceToken(token)), gt(commerceGuestPayers.expiresAt, now))).limit(1);
    if (guest) return { guestId: guest.id, expiresAt: guest.expiresAt };
  }
  try { return await verifyCommerceSession(event, now); }
  catch (error) { if (!(error && typeof error === "object" && "statusCode" in error && error.statusCode === 401)) throw error; }
  if (!create) throw createError({ statusCode: 401, statusMessage: "Purchase session required" });
  const fresh = createCommerceToken();
  const expiresAt = new Date(now.getTime() + DURATION);
  const [guest] = await db.insert(commerceGuestPayers).values({ tokenHash: hashCommerceToken(fresh), expiresAt }).returning();
  if (!guest) throw new Error("Guest payer insert failed");
  setCookie(event, guestCookieName(), fresh, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: DURATION / 1000 });
  return { guestId: guest.id, expiresAt };
}
