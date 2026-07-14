import { getQuery } from "h3";
import { revokePlayerLinks } from "../../../services/mobile-player-link";
import { requireMobileUser } from "../../../services/mobile-user";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default defineEventHandler(async (event) => {
  const { auth } = await requireMobileUser(event);
  const query = getQuery(event);
  const playerId = query.playerId ? String(query.playerId) : undefined;
  const edition = query.edition ? String(query.edition).toLowerCase() : undefined;
  if (playerId && !UUID_PATTERN.test(playerId)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid playerId" });
  }
  if (edition && edition !== "java" && edition !== "bedrock") {
    throw createError({ statusCode: 400, statusMessage: "Invalid edition" });
  }

  const revoked = await revokePlayerLinks(auth.uid, {
    playerId,
    edition: edition as "java" | "bedrock" | undefined,
  });
  return { data: { revoked: revoked.length, links: revoked } };
});
