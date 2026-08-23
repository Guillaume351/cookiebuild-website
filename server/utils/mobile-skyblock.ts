import { createHash } from "node:crypto";
import { createError } from "h3";
import {
  SKYBLOCK_CATEGORIES,
  SKYBLOCK_RARITIES,
  type SkyblockCategory,
  type SkyblockRarity,
} from "../services/mobile-skyblock-catalog";
import { requiredInteger, requiredUuid } from "./mobile-validation";

export const SKYBLOCK_MARKET_SORTS = ["recent", "price_asc", "price_desc"] as const;
export const SKYBLOCK_LISTING_STATUSES = ["active", "sold", "cancelled", "expired", "all"] as const;
const ITEM_ID_PATTERN = /^[a-z0-9_]{1,64}$/;
const QUEST_ID_PATTERN = /^[a-z0-9_]{1,64}$/;

export type SkyblockMarketSort = typeof SKYBLOCK_MARKET_SORTS[number];
export type SkyblockListingStatus = typeof SKYBLOCK_LISTING_STATUSES[number];

export function skyblockError(statusCode: number, code: string, statusMessage: string) {
  return createError({ statusCode, statusMessage, data: { code } });
}

function objectBody(value: unknown, keys: readonly string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw skyblockError(400, "INVALID_REQUEST", "Invalid request body");
  }
  const body = value as Record<string, unknown>;
  const actual = Object.keys(body).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw skyblockError(400, "INVALID_REQUEST", "Invalid request body");
  }
  return body;
}

function enumValue<T extends string>(value: unknown, values: readonly T[], field: string): T | null {
  if (value === undefined || value === null || value === "") return null;
  const candidate = String(value).trim();
  if (!values.includes(candidate as T)) {
    throw skyblockError(400, "INVALID_REQUEST", `Invalid ${field}`);
  }
  return candidate as T;
}

function queryString(value: unknown) {
  if (Array.isArray(value)) throw skyblockError(400, "INVALID_REQUEST", "Invalid query parameter");
  return value === undefined || value === null || value === "" ? null : String(value);
}

function queryInteger(value: unknown, field: string, minimum: number, maximum: number) {
  const raw = queryString(value);
  if (raw === null) return null;
  if (!/^\d+$/.test(raw)) throw skyblockError(400, "INVALID_REQUEST", `Invalid ${field}`);
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw skyblockError(400, "INVALID_REQUEST", `Invalid ${field}`);
  }
  return parsed;
}

export function skyblockItemId(value: unknown, field = "itemId") {
  const itemId = String(value ?? "").trim();
  if (!ITEM_ID_PATTERN.test(itemId)) {
    throw skyblockError(400, "INVALID_REQUEST", `Invalid ${field}`);
  }
  return itemId;
}

export function skyblockPageQuery(query: Record<string, unknown>) {
  return {
    cursor: queryString(query.cursor),
    pageSize: queryInteger(query.pageSize, "pageSize", 1, 50) ?? 20,
  };
}

export function skyblockInventoryQuery(query: Record<string, unknown>) {
  const page = skyblockPageQuery(query);
  const marketableRaw = queryString(query.marketable);
  if (marketableRaw !== null && marketableRaw !== "true" && marketableRaw !== "false") {
    throw skyblockError(400, "INVALID_REQUEST", "Invalid marketable");
  }
  return {
    ...page,
    category: enumValue(query.category, SKYBLOCK_CATEGORIES, "category") as SkyblockCategory | null,
    marketable: marketableRaw === null ? null : marketableRaw === "true",
  };
}

export function skyblockMarketQuery(query: Record<string, unknown>) {
  const page = skyblockPageQuery(query);
  const minPrice = queryInteger(query.minPrice, "minPrice", 1, 2_000_000_000);
  const maxPrice = queryInteger(query.maxPrice, "maxPrice", 1, 2_000_000_000);
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    throw skyblockError(400, "INVALID_REQUEST", "Invalid price range");
  }
  return {
    ...page,
    itemId: query.itemId === undefined || query.itemId === "" ? null : skyblockItemId(query.itemId),
    category: enumValue(query.category, SKYBLOCK_CATEGORIES, "category") as SkyblockCategory | null,
    rarity: enumValue(query.rarity, SKYBLOCK_RARITIES, "rarity") as SkyblockRarity | null,
    minPrice,
    maxPrice,
    sort: (enumValue(query.sort, SKYBLOCK_MARKET_SORTS, "sort") ?? "recent") as SkyblockMarketSort,
  };
}

export function skyblockListingsQuery(query: Record<string, unknown>) {
  return {
    ...skyblockPageQuery(query),
    status: (enumValue(query.status, SKYBLOCK_LISTING_STATUSES, "status") ?? "all") as SkyblockListingStatus,
  };
}

export function listingQuoteBody(value: unknown) {
  const body = objectBody(value, ["inventoryItemId", "quantity", "priceCoins"]);
  return {
    inventoryItemId: requiredUuid(body.inventoryItemId, "inventoryItemId"),
    quantity: requiredInteger(body.quantity, "quantity", { minimum: 1, maximum: 1_000_000 }),
    priceCoins: requiredInteger(body.priceCoins, "priceCoins", { minimum: 1, maximum: 2_000_000_000 }),
  };
}

export function createListingBody(value: unknown) {
  const body = objectBody(value, ["quoteId"]);
  return { quoteId: requiredUuid(body.quoteId, "quoteId") };
}

export function cancelListingBody(value: unknown) {
  objectBody(value, []);
  return {};
}

export function purchaseListingBody(value: unknown) {
  const body = objectBody(value, ["expectedPriceCoins"]);
  return {
    expectedPriceCoins: requiredInteger(body.expectedPriceCoins, "expectedPriceCoins", {
      minimum: 1,
      maximum: 2_000_000_000,
    }),
  };
}

export function generatorUpgradeBody(value: unknown) {
  const body = objectBody(value, ["expectedCostCoins", "expectedIslandVersion", "expectedNextTier"]);
  return {
    expectedIslandVersion: requiredInteger(body.expectedIslandVersion, "expectedIslandVersion", {
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
    }),
    expectedNextTier: requiredInteger(body.expectedNextTier, "expectedNextTier", { minimum: 2, maximum: 5 }),
    expectedCostCoins: requiredInteger(body.expectedCostCoins, "expectedCostCoins", {
      minimum: 1,
      maximum: 2_000_000_000,
    }),
  };
}

export function emptySkyblockMutationBody(value: unknown) {
  objectBody(value, []);
  return {};
}

export function skyblockQuestId(value: unknown) {
  const questId = String(value ?? "").trim();
  if (!QUEST_ID_PATTERN.test(questId)) {
    throw skyblockError(400, "INVALID_REQUEST", "Invalid questId");
  }
  return questId;
}

export function skyblockIdempotencyKey(value: unknown) {
  try {
    return requiredUuid(value, "Idempotency-Key");
  } catch {
    throw skyblockError(428, "IDEMPOTENCY_KEY_REQUIRED", "Valid Idempotency-Key required");
  }
}

export function hashSkyblockRequest(scope: string, body: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify({ scope, body })).digest("hex");
}

export interface SkyblockCursor {
  value: string | number;
  id: string;
}

export function encodeSkyblockCursor(cursor: SkyblockCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeSkyblockCursor(value: string | null): SkyblockCursor | null {
  if (value === null) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<SkyblockCursor>;
    const id = requiredUuid(parsed.id, "cursor");
    if (typeof parsed.value !== "string" && typeof parsed.value !== "number") throw new Error();
    if (typeof parsed.value === "number" && !Number.isSafeInteger(parsed.value)) throw new Error();
    if (typeof parsed.value === "string" && parsed.value.length > 64) throw new Error();
    return { value: parsed.value, id };
  } catch {
    throw skyblockError(400, "INVALID_REQUEST", "Invalid cursor");
  }
}
