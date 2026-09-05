import { eq } from "drizzle-orm";
import { deleteCookie } from "h3";
import db from "../../../db/client";
import { commerceGuestPayers } from "../../../db/schema";
import { guestCookieName, resolveCommercePayer } from "../../services/commerce-payer";
export default defineEventHandler(async event => {
  const payer = await resolveCommercePayer(event);
  if ("guestId" in payer) await db.update(commerceGuestPayers).set({ expiresAt: new Date() }).where(eq(commerceGuestPayers.id, payer.guestId));
  deleteCookie(event, guestCookieName(), { path: "/", secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax" });
  return { data: { signedOut: true } };
});
