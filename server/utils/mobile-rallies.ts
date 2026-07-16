import { createError } from "h3";

export const PLAYER_RALLY_RESPONSES = ["joining", "unavailable"] as const;

export type PlayerRallyResponse = typeof PLAYER_RALLY_RESPONSES[number];

export function exactPlayerRallyResponseBody(value: unknown): PlayerRallyResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid response body" });
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== 1 || !("response" in input)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid response body" });
  }
  if (!PLAYER_RALLY_RESPONSES.includes(input.response as PlayerRallyResponse)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid response" });
  }
  return input.response as PlayerRallyResponse;
}
