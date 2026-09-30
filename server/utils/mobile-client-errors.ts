import { createError } from "h3";

export const CLIENT_ERROR_LIMITS = {
  message: 500,
  stack: 4_000,
  stackLines: 40,
  route: 200,
  appVersion: 32,
} as const;

const APP_VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+_-]{0,31}$/;
const PLATFORMS = new Set(["ios", "android"]);

export interface ClientErrorReport {
  message: string;
  stack: string | null;
  appVersion: string;
  platform: "ios" | "android";
  route: string | null;
}

/**
 * Removes values that could identify a person or grant access before a client
 * report reaches logs: e-mails, tokens, UUIDs, IP addresses and query strings.
 */
export function scrubClientText(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\bBearer\s+[^\s"']+/gi, "Bearer [token]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+){1,2}/g, "[token]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[uuid]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[ip]")
    .replace(/((?:https?|cookiebuild):\/\/[^\s?#"']+)[?#][^\s"']*/gi, "$1")
    .replace(/\b[A-Za-z0-9+/_-]{32,}={0,2}/g, "[redacted]");
}

function truncate(value: string, maximum: number) {
  return value.length > maximum ? `${value.slice(0, maximum - 1)}…` : value;
}

function requiredText(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${field}` });
  }
  return value.trim();
}

function optionalText(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${field}` });
  }
  return value.trim() || null;
}

export function parseClientErrorReport(body: unknown): ClientErrorReport {
  const input = typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
  const platform = requiredText(input.platform, "platform").toLowerCase();
  if (!PLATFORMS.has(platform)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid platform" });
  }
  const appVersion = requiredText(input.appVersion, "appVersion");
  if (!APP_VERSION_PATTERN.test(appVersion)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid appVersion" });
  }
  // Truncate before scrubbing too, so hostile payloads cost bounded regex work.
  const message = scrubClientText(requiredText(input.message, "message").slice(0, 4 * CLIENT_ERROR_LIMITS.message));
  const rawStack = optionalText(input.stack, "stack");
  const stack = rawStack
    ? scrubClientText(
        rawStack.slice(0, 2 * CLIENT_ERROR_LIMITS.stack)
          .split(/\r?\n/)
          .slice(0, CLIENT_ERROR_LIMITS.stackLines)
          .join("\n"),
      )
    : null;
  const rawRoute = optionalText(input.route, "route");
  const route = rawRoute
    ? scrubClientText(rawRoute.slice(0, 4 * CLIENT_ERROR_LIMITS.route).split(/[?#]/, 1)[0] || "/")
    : null;
  return {
    message: truncate(message, CLIENT_ERROR_LIMITS.message),
    stack: stack ? truncate(stack, CLIENT_ERROR_LIMITS.stack) : null,
    appVersion,
    platform: platform as "ios" | "android",
    route: route ? truncate(route, CLIENT_ERROR_LIMITS.route) : null,
  };
}
