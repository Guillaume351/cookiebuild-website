import { and, eq, gt, isNull } from "drizzle-orm";
import { createError, getCookie, type H3Event } from "h3";
import db from "../../db/client";
import { commerceSessions, playerdata, playerLinkChallenges } from "../../db/schema";
import { commerceSessionCookieName, createCommerceToken, hashCommerceToken, validCommerceToken } from "../utils/commerce-security";
import { isValidLinkPepper, linkCodeHmac, normalizeLinkCode } from "../utils/mobile-validation";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60_000;

export interface CommerceAuthContext {
  sessionId: string;
  playerId: string;
  playerName: string | null;
  expiresAt: Date;
}

type CommerceContext = H3Event["context"] & { commerceAuth?: CommerceAuthContext };

export async function claimCommerceSession(input: unknown, now = new Date()) {
  const pepper = process.env.MOBILE_LINK_PEPPER;
  if (!isValidLinkPepper(pepper)) {
    throw createError({ statusCode: 503, statusMessage: "Commerce linking is not configured" });
  }
  const code = normalizeLinkCode(input);
  const codeHmac = linkCodeHmac(code, pepper!);

  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select()
      .from(playerLinkChallenges)
      .where(and(
        eq(playerLinkChallenges.codeHmac, codeHmac),
        eq(playerLinkChallenges.purpose, "commerce_session"),
        isNull(playerLinkChallenges.consumedAt),
      ))
      .limit(1);
    if (!candidate || candidate.expiresAt <= now) {
      throw createError({ statusCode: 400, statusMessage: "Invalid or expired commerce link code" });
    }

    const [player] = await tx
      .select({ id: playerdata.id, name: playerdata.name })
      .from(playerdata)
      .where(eq(playerdata.id, candidate.playerId))
      .limit(1)
      .for("update");
    if (!player) throw createError({ statusCode: 400, statusMessage: "Invalid or expired commerce link code" });

    const [challenge] = await tx
      .select()
      .from(playerLinkChallenges)
      .where(and(
        eq(playerLinkChallenges.id, candidate.id),
        eq(playerLinkChallenges.playerId, player.id),
        eq(playerLinkChallenges.codeHmac, codeHmac),
        eq(playerLinkChallenges.purpose, "commerce_session"),
        isNull(playerLinkChallenges.consumedAt),
      ))
      .limit(1)
      .for("update");
    if (!challenge || challenge.expiresAt <= now) {
      throw createError({ statusCode: 400, statusMessage: "Invalid or expired commerce link code" });
    }

    const [consumed] = await tx
      .update(playerLinkChallenges)
      .set({ consumedAt: now })
      .where(and(
        eq(playerLinkChallenges.id, challenge.id),
        eq(playerLinkChallenges.purpose, "commerce_session"),
        isNull(playerLinkChallenges.consumedAt),
      ))
      .returning({ id: playerLinkChallenges.id });
    if (!consumed) throw createError({ statusCode: 400, statusMessage: "Invalid or expired commerce link code" });

    await tx
      .update(commerceSessions)
      .set({ revokedAt: now })
      .where(and(eq(commerceSessions.playerId, player.id), isNull(commerceSessions.revokedAt)));

    const token = createCommerceToken();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
    const [session] = await tx
      .insert(commerceSessions)
      .values({ playerId: player.id, tokenHash: hashCommerceToken(token), createdAt: now, lastSeenAt: now, expiresAt })
      .returning({ id: commerceSessions.id });
    if (!session) throw new Error("Commerce session insert did not return an identifier");

    return { token, sessionId: session.id, playerId: player.id, playerName: player.name, expiresAt };
  });
}

export async function verifyCommerceSession(event: H3Event, now = new Date()) {
  const token = getCookie(event, commerceSessionCookieName());
  if (!validCommerceToken(token)) {
    throw createError({ statusCode: 401, statusMessage: "Minecraft commerce session required" });
  }
  const [session] = await db
    .select({
      id: commerceSessions.id,
      playerId: commerceSessions.playerId,
      playerName: playerdata.name,
      expiresAt: commerceSessions.expiresAt,
    })
    .from(commerceSessions)
    .innerJoin(playerdata, eq(playerdata.id, commerceSessions.playerId))
    .where(and(
      eq(commerceSessions.tokenHash, hashCommerceToken(token)),
      isNull(commerceSessions.revokedAt),
      gt(commerceSessions.expiresAt, now),
    ))
    .limit(1);
  if (!session) throw createError({ statusCode: 401, statusMessage: "Invalid or expired commerce session" });

  await db.update(commerceSessions).set({ lastSeenAt: now }).where(eq(commerceSessions.id, session.id));
  const auth: CommerceAuthContext = {
    sessionId: session.id,
    playerId: session.playerId,
    playerName: session.playerName,
    expiresAt: session.expiresAt,
  };
  (event.context as CommerceContext).commerceAuth = auth;
  return auth;
}

export function requireCommerceAuth(event: H3Event) {
  const auth = (event.context as CommerceContext).commerceAuth;
  if (!auth) throw createError({ statusCode: 401, statusMessage: "Minecraft commerce session required" });
  return auth;
}

export async function revokeCommerceSession(event: H3Event, now = new Date()) {
  const auth = requireCommerceAuth(event);
  await db.update(commerceSessions).set({ revokedAt: now }).where(eq(commerceSessions.id, auth.sessionId));
}
