import { createError } from "h3";

export const PLAYER_REPORT_REASONS = [
  "spam",
  "harassment",
  "hate_or_discrimination",
  "sexual_content",
  "threats",
  "impersonation",
  "cheating",
  "inappropriate_name",
] as const;

export type PlayerReportReason = typeof PLAYER_REPORT_REASONS[number];

const PLAYER_NAME_PATTERN = /^[A-Za-z0-9_ .-]{1,32}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function mobileFeatureEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function requireMobileSocialFeature(feature: "friends" | "parties" | "social") {
  const friends = mobileFeatureEnabled(process.env.MOBILE_FRIENDS_ENABLED);
  const parties = mobileFeatureEnabled(process.env.MOBILE_PARTIES_ENABLED);
  const enabled = feature === "friends" ? friends : feature === "parties" ? parties : friends || parties;
  if (!enabled) {
    throw createError({ statusCode: 404, statusMessage: "Feature unavailable" });
  }
}

export function exactPlayerName(value: unknown) {
  const name = String(value ?? "").trim();
  if (!PLAYER_NAME_PATTERN.test(name)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid playerName" });
  }
  return name;
}

export function playerId(value: unknown, field = "playerId") {
  const id = String(value ?? "").trim().toLowerCase();
  if (!UUID_PATTERN.test(id)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${field}` });
  }
  return id;
}

export function friendRequestTarget(body: unknown) {
  const candidate = body && typeof body === "object"
    ? body as { playerId?: unknown; playerName?: unknown }
    : {};
  const hasPlayerId = candidate.playerId !== undefined && candidate.playerId !== null;
  const hasPlayerName = candidate.playerName !== undefined && candidate.playerName !== null;
  if (hasPlayerId === hasPlayerName) {
    throw createError({
      statusCode: 400,
      statusMessage: "Exactly one of playerId or playerName is required",
    });
  }
  return hasPlayerId
    ? { playerId: playerId(candidate.playerId) }
    : { playerName: exactPlayerName(candidate.playerName) };
}

export function reportReason(value: unknown): PlayerReportReason {
  const reason = String(value ?? "").trim();
  if (!PLAYER_REPORT_REASONS.includes(reason as PlayerReportReason)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid reason" });
  }
  return reason as PlayerReportReason;
}

export function canonicalPlayerPair(first: string, second: string) {
  if (first === second) {
    throw createError({ statusCode: 400, statusMessage: "Cannot target your own player" });
  }
  return first < second
    ? { playerLowId: first, playerHighId: second }
    : { playerLowId: second, playerHighId: first };
}
