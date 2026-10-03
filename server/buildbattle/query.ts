import { createError } from "h3";
import {
  BUILD_SHORT_CODE_PATTERN,
  normalizeGalleryLocale,
  type BuildPeriod,
  type BuildSort,
  type GalleryLocale,
} from "../../shared/buildbattle-gallery";
import { addDaysToDateKey, isoWeekdayOfDateKey, parisDateKey, parisWallTimeToUtc } from "../utils/paris-time";

export const GALLERY_PAGE = { defaultLimit: 24, maxLimit: 48 } as const;

/** Keyset position of the last item of a page. `createdUs` keeps PostgreSQL's microsecond precision. */
export interface GalleryCursor {
  sort: BuildSort;
  likeCount: number;
  createdUs: string;
  id: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MICROS_PATTERN = /^-?\d{1,19}$/;

export function encodeGalleryCursor(cursor: GalleryCursor) {
  const parts = cursor.sort === "top"
    ? ["t", String(cursor.likeCount), cursor.createdUs, cursor.id]
    : ["r", cursor.createdUs, cursor.id];
  return Buffer.from(parts.join("|"), "utf8").toString("base64url");
}

export function decodeGalleryCursor(value: unknown, sort: BuildSort): GalleryCursor | null {
  if (value === undefined || value === null || value === "") return null;
  const invalid = () => createError({ statusCode: 400, statusMessage: "Invalid cursor" });
  if (typeof value !== "string" || value.length > 200) throw invalid();
  const parts = Buffer.from(value, "base64url").toString("utf8").split("|");
  if (sort === "top") {
    const [kind, likes, createdUs, id] = parts;
    const likeCount = Number(likes);
    if (parts.length !== 4 || kind !== "t" || !Number.isInteger(likeCount) || likeCount < 0
      || !MICROS_PATTERN.test(createdUs ?? "") || !UUID_PATTERN.test(id ?? "")) throw invalid();
    return { sort, likeCount, createdUs: createdUs!, id: id!.toLowerCase() };
  }
  const [kind, createdUs, id] = parts;
  if (parts.length !== 3 || kind !== "r" || !MICROS_PATTERN.test(createdUs ?? "") || !UUID_PATTERN.test(id ?? "")) {
    throw invalid();
  }
  return { sort, likeCount: 0, createdUs: createdUs!, id: id!.toLowerCase() };
}

/** Start of the current Paris calendar week (Monday 00:00) or month (1st 00:00); null for "all". */
export function galleryPeriodStart(period: BuildPeriod, now = new Date()): Date | null {
  if (period === "all") return null;
  const today = parisDateKey(now);
  if (period === "week") return parisWallTimeToUtc(addDaysToDateKey(today, 1 - isoWeekdayOfDateKey(today)), 0, 0);
  return parisWallTimeToUtc(`${today.slice(0, 8)}01`, 0, 0);
}

export interface GalleryListQuery {
  sort: BuildSort;
  period: BuildPeriod;
  limit: number;
  cursor: GalleryCursor | null;
  player: string | null;
  locale: GalleryLocale | null;
}

// Java names plus Floodgate/Bedrock prefixes and spaces; never control characters.
const PLAYER_NAME_PATTERN = /^[^\u0000-\u001f\u007f]{1,32}$/;

export function parseGalleryListQuery(query: Record<string, unknown>): GalleryListQuery {
  const sort = query.sort === undefined || query.sort === "" ? "top" : query.sort;
  if (sort !== "top" && sort !== "recent") throw createError({ statusCode: 400, statusMessage: "Invalid sort" });
  const period = query.period === undefined || query.period === "" ? "all" : query.period;
  if (period !== "week" && period !== "month" && period !== "all") {
    throw createError({ statusCode: 400, statusMessage: "Invalid period" });
  }
  let limit: number = GALLERY_PAGE.defaultLimit;
  if (query.limit !== undefined && query.limit !== "") {
    const parsed = Number(query.limit);
    if (!Number.isInteger(parsed) || parsed < 1) throw createError({ statusCode: 400, statusMessage: "Invalid limit" });
    limit = Math.min(parsed, GALLERY_PAGE.maxLimit);
  }
  let player: string | null = null;
  if (query.player !== undefined && query.player !== "") {
    if (typeof query.player !== "string" || !PLAYER_NAME_PATTERN.test(query.player.trim())) {
      throw createError({ statusCode: 400, statusMessage: "Invalid player" });
    }
    player = query.player.trim();
  }
  return {
    sort,
    period,
    limit,
    cursor: decodeGalleryCursor(query.cursor, sort),
    player,
    locale: normalizeGalleryLocale(query.locale),
  };
}

export function parseShortCode(value: unknown) {
  if (typeof value !== "string" || !BUILD_SHORT_CODE_PATTERN.test(value)) {
    throw createError({ statusCode: 404, statusMessage: "Build not found" });
  }
  return value;
}
