export const NOTIFICATION_KINDS = [
  "announcement",
  "event",
  "server_status",
  "social",
  "rally",
  "weekly_digest",
  "daily_reminder",
  "weekly_reminder",
  "friend_online",
] as const;

export type NotificationPreferenceKind = typeof NOTIFICATION_KINDS[number];

export interface NotificationAudience {
  all?: true;
  firebaseUid?: string;
  mobileUserIds?: string[];
  deviceIds?: string[];
}

export interface NotificationPayload {
  title: string;
  body?: string;
  imageUrl?: string;
  deepLink?: string;
  data: Record<string, string>;
  urgent: boolean;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLAYER_RALLY_FIELDS = new Set([
  "schemaVersion",
  "rallyId",
  "source",
  "gamemode",
  "edition",
  "queuedCount",
  "neededCount",
  "actorDisplayName",
]);
const PLAYER_RALLY_GAMEMODES = {
  microbattles: "MicroBattles",
  pitchout: "Pitchout",
  skywars: "SkyWars",
  buildbattles: "BuildBattles",
} as const;
const PLAYER_RALLY_ACTOR_PATTERN = /^[\p{L}\p{N}_. -]{1,32}$/u;

export class PermanentOutboxError extends Error {
  override name = "PermanentOutboxError";
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function boundedText(value: unknown, field: string, maximum: number, required = false) {
  if (value === undefined || value === null) {
    if (required) throw new PermanentOutboxError(`${field} is required`);
    return undefined;
  }
  if (typeof value !== "string") throw new PermanentOutboxError(`${field} must be a string`);
  const text = value.trim();
  if (!text && required) throw new PermanentOutboxError(`${field} is required`);
  if (text.length > maximum) throw new PermanentOutboxError(`${field} is too long`);
  return text || undefined;
}

export function preferenceKind(kind: string): NotificationPreferenceKind | undefined {
  if (["announcement", "announcements", "news", "news_published"].includes(kind)) {
    return "announcement";
  }
  if (["event", "event_reminder", "event_start"].includes(kind)) return "event";
  if (["server_status", "server_offline", "server_recovered"].includes(kind)) {
    return "server_status";
  }
  if (["social", "friend_request", "party_invite"].includes(kind)) return "social";
  if (kind === "player_rally") return "rally";
  if (kind === "weekly_digest") return "weekly_digest";
  if (kind === "daily_goal_reminder") return "daily_reminder";
  if (kind === "weekly_goal_reminder") return "weekly_reminder";
  if (kind === "friend_online") return "friend_online";
  return undefined;
}

export function parseNotificationAudience(
  value: unknown,
  kind?: string,
  allowInternalDeviceRetry = false,
): NotificationAudience {
  const input = record(value);
  if (!input) throw new PermanentOutboxError("audience must be an object");

  const audience: NotificationAudience = {};
  let selectors = 0;
  if (input.all === true) {
    audience.all = true;
    selectors += 1;
  }
  if (input.firebaseUid !== undefined) {
    const uid = boundedText(input.firebaseUid, "audience.firebaseUid", 128, true);
    audience.firebaseUid = uid;
    selectors += 1;
  }
  for (const key of ["mobileUserIds", "deviceIds"] as const) {
    const candidate = input[key];
    if (candidate === undefined) continue;
    if (!Array.isArray(candidate) || candidate.length === 0 || candidate.length > 5_000) {
      throw new PermanentOutboxError(`audience.${key} must contain 1 to 5000 UUIDs`);
    }
    const ids = [...new Set(candidate)];
    if (!ids.every((id): id is string => typeof id === "string" && UUID_PATTERN.test(id))) {
      throw new PermanentOutboxError(`audience.${key} contains an invalid UUID`);
    }
    audience[key] = ids;
    selectors += 1;
  }
  if (selectors !== 1) {
    throw new PermanentOutboxError("audience must contain exactly one selector");
  }
  const internalRallyRetry = allowInternalDeviceRetry && Boolean(audience.deviceIds);
  if (kind === "player_rally" && audience.all !== true && !internalRallyRetry) {
    throw new PermanentOutboxError("player_rally audience must be all");
  }
  return audience;
}

function safeDeepLink(value: unknown) {
  const text = boundedText(value, "payload.deepLink", 2048);
  if (!text) return undefined;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new PermanentOutboxError("payload.deepLink is invalid");
  }
  const permittedWebHost = url.protocol === "https:"
    && (url.hostname === "cookie-build.com" || url.hostname === "www.cookie-build.com");
  if (url.protocol !== "cookiebuild:" && !permittedWebHost) {
    throw new PermanentOutboxError("payload.deepLink uses an unsupported origin");
  }
  return text;
}

function safeImageUrl(value: unknown) {
  const text = boundedText(value, "payload.imageUrl", 2048);
  if (!text) return undefined;
  try {
    if (new URL(text).protocol !== "https:") throw new Error("not https");
  } catch {
    throw new PermanentOutboxError("payload.imageUrl must be an HTTPS URL");
  }
  return text;
}

export function parseNotificationPayload(
  value: unknown,
  kind?: string,
): NotificationPayload {
  return parseNotificationPayloadForKind(value, kind);
}

function rallyInteger(value: unknown, field: string, minimum: number) {
  if (
    typeof value !== "number"
    || !Number.isInteger(value)
    || value < minimum
    || value > 1_000
  ) {
    throw new PermanentOutboxError(`payload.${field} must be an integer from ${minimum} to 1000`);
  }
  return value;
}

export function parsePlayerRallyPayload(value: unknown): NotificationPayload {
  const input = record(value);
  if (!input) throw new PermanentOutboxError("payload must be an object");
  const fields = Object.keys(input);
  if (
    fields.length !== PLAYER_RALLY_FIELDS.size
    || fields.some((field) => !PLAYER_RALLY_FIELDS.has(field))
  ) {
    throw new PermanentOutboxError("player_rally payload fields are invalid");
  }
  if (input.schemaVersion !== 1) {
    throw new PermanentOutboxError("payload.schemaVersion must be 1");
  }
  if (typeof input.rallyId !== "string" || !UUID_PATTERN.test(input.rallyId)) {
    throw new PermanentOutboxError("payload.rallyId must be a UUID");
  }
  if (input.source !== "player" && input.source !== "automatic") {
    throw new PermanentOutboxError("payload.source must be player or automatic");
  }
  if (
    typeof input.gamemode !== "string"
    || !(input.gamemode in PLAYER_RALLY_GAMEMODES)
  ) {
    throw new PermanentOutboxError("payload.gamemode is unsupported");
  }
  if (input.edition !== "crossplay") {
    throw new PermanentOutboxError("payload.edition must be crossplay");
  }
  const queuedCount = rallyInteger(input.queuedCount, "queuedCount", 0);
  const neededCount = rallyInteger(input.neededCount, "neededCount", 0);
  let actorDisplayName: string | null = null;
  if (input.source === "player") {
    if (neededCount < 1) {
      throw new PermanentOutboxError("payload.neededCount must be positive for player rallies");
    }
    if (typeof input.actorDisplayName !== "string") {
      throw new PermanentOutboxError("payload.actorDisplayName is required for player rallies");
    }
    actorDisplayName = input.actorDisplayName.trim().normalize("NFKC");
    if (!PLAYER_RALLY_ACTOR_PATTERN.test(actorDisplayName)) {
      throw new PermanentOutboxError("payload.actorDisplayName is not a public player name");
    }
  } else if (input.actorDisplayName !== null) {
    throw new PermanentOutboxError("payload.actorDisplayName must be null for automatic rallies");
  }
  if (neededCount === 0 && queuedCount === 0) {
    throw new PermanentOutboxError("payload.queuedCount must be positive for a starting game");
  }

  const gamemode = input.gamemode as keyof typeof PLAYER_RALLY_GAMEMODES;
  const starting = neededCount === 0;
  const title = starting
    ? `${PLAYER_RALLY_GAMEMODES[gamemode]} is starting soon`
    : `Players needed for ${PLAYER_RALLY_GAMEMODES[gamemode]}`;
  const countSummary = `${queuedCount} queued, ${neededCount} more needed`;
  const body = starting
    ? `${queuedCount} ${queuedCount === 1 ? "player is" : "players are"} ready. Join now before the match starts.`
    : actorDisplayName
    ? `${actorDisplayName} is rallying players: ${countSummary}.`
    : `${countSummary} to start.`;
  return {
    title,
    body,
    deepLink: `cookiebuild://play?gamemode=${gamemode}`,
    data: {
      type: "player_rally",
      schemaVersion: "1",
      rallyId: input.rallyId,
      source: input.source,
      gamemode,
      edition: "crossplay",
      queuedCount: String(queuedCount),
      neededCount: String(neededCount),
      ...(actorDisplayName ? { actorDisplayName } : {}),
    },
    urgent: false,
  };
}

export function parseNotificationPayloadForKind(
  value: unknown,
  kind?: string,
): NotificationPayload {
  if (kind === "player_rally") return parsePlayerRallyPayload(value);
  const input = record(value);
  if (!input) throw new PermanentOutboxError("payload must be an object");
  const nested = record(input.notification);
  const title = boundedText(input.title ?? nested?.title, "payload.title", 180, true)!;
  const body = boundedText(input.body ?? nested?.body, "payload.body", 1_000);
  const imageUrl = safeImageUrl(input.imageUrl ?? nested?.imageUrl);
  const deepLink = safeDeepLink(input.deepLink);
  if (input.urgent !== undefined && typeof input.urgent !== "boolean") {
    throw new PermanentOutboxError("payload.urgent must be a boolean");
  }

  const sourceData = input.data === undefined ? {} : record(input.data);
  if (!sourceData) throw new PermanentOutboxError("payload.data must be an object");
  const data: Record<string, string> = {};
  for (const [key, item] of Object.entries(sourceData)) {
    const lowercaseKey = key.toLowerCase();
    if (
      !/^[A-Za-z0-9_.-]{1,64}$/.test(key)
      || lowercaseKey === "from"
      || lowercaseKey === "message_type"
      || lowercaseKey.startsWith("google.")
      || lowercaseKey.startsWith("gcm.")
    ) {
      throw new PermanentOutboxError("payload.data contains an invalid key");
    }
    if (!["string", "number", "boolean"].includes(typeof item)) {
      throw new PermanentOutboxError(`payload.data.${key} must be scalar`);
    }
    data[key] = String(item);
  }
  const estimatedPayload = JSON.stringify({ title, body, imageUrl, deepLink, data });
  if (Buffer.byteLength(estimatedPayload, "utf8") > 3_500) {
    throw new PermanentOutboxError("payload is too large");
  }
  return { title, body, imageUrl, deepLink, data, urgent: input.urgent === true };
}

function localMinutes(date: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    const minute = Number(parts.find((part) => part.type === "minute")?.value);
    return Number.isInteger(hour) && Number.isInteger(minute) ? (hour * 60) + minute : undefined;
  } catch {
    return undefined;
  }
}

function offsetMinutes(date: Date, timezoneOffsetMinutes: number | null) {
  if (
    timezoneOffsetMinutes === null
    || !Number.isInteger(timezoneOffsetMinutes)
    || timezoneOffsetMinutes < -840
    || timezoneOffsetMinutes > 840
  ) {
    return undefined;
  }
  const utcMinutes = (date.getUTCHours() * 60) + date.getUTCMinutes();
  return ((utcMinutes + timezoneOffsetMinutes) % (24 * 60) + (24 * 60)) % (24 * 60);
}

function clockMinutes(value: string) {
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) return undefined;
  const [hour, minute] = value.split(":").map(Number);
  return (hour! * 60) + minute!;
}

export function isInQuietHours(
  date: Date,
  timezone: string | null,
  start: string | null,
  end: string | null,
  timezoneOffsetMinutes: number | null = null,
) {
  if (!start || !end || start === end) return false;
  // Mobile clients always sync their UTC offset, while an IANA timezone is not
  // available on every Flutter platform. Prefer the DST-aware timezone and
  // fall back to the validated offset so quiet hours never silently fail open.
  const now = (timezone ? localMinutes(date, timezone) : undefined)
    ?? offsetMinutes(date, timezoneOffsetMinutes);
  const startMinutes = clockMinutes(start);
  const endMinutes = clockMinutes(end);
  if (now === undefined || startMinutes === undefined || endMinutes === undefined) return false;
  return startMinutes < endMinutes
    ? now >= startMinutes && now < endMinutes
    : now >= startMinutes || now < endMinutes;
}

export function retryDelayMs(attempts: number, jitter = Math.random()) {
  const base = Math.min(60 * 60_000, 30_000 * (2 ** Math.max(0, attempts - 1)));
  const boundedJitter = Math.min(1, Math.max(0, jitter));
  return Math.round(base * (0.8 + (boundedJitter * 0.4)));
}

export function shouldDeadLetterOutbox(
  kind: string,
  attempts: number,
  maxAttempts: number,
  permanentFailure: boolean,
) {
  if (kind === "firebase_auth_delete") return false;
  return permanentFailure || attempts >= maxAttempts;
}

export type FcmFailureDisposition = "disable" | "retry";

export function classifyFcmError(code: string | undefined): FcmFailureDisposition {
  if ([
    "messaging/invalid-registration-token",
    "messaging/registration-token-not-registered",
    "messaging/mismatched-credential",
    "messaging/sender-id-mismatch",
  ].includes(code ?? "")) {
    return "disable";
  }
  return "retry";
}

export function safeError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code).slice(0, 120)
    : undefined;
  const message = error instanceof Error ? error.message : String(error);
  return { code, message: message.replace(/[\r\n\t]+/g, " ").slice(0, 500) };
}
