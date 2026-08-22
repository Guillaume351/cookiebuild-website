import { sql } from "drizzle-orm";
import db from "../../db/client";
import type { MobileDbTransaction } from "./mobile-user";
import { requirePrimaryLinkedPlayer } from "./mobile-social";
import {
  SKYBLOCK_CATALOG_VERSION,
  SKYBLOCK_ITEM_CATALOG,
  skyblockCatalogItem,
  type SkyblockCategory,
  type SkyblockRarity,
} from "./mobile-skyblock-catalog";
import {
  decodeSkyblockCursor,
  encodeSkyblockCursor,
  hashSkyblockRequest,
  skyblockError,
} from "../utils/mobile-skyblock";

const LISTING_FEE_BPS = 500;
const QUOTE_TTL_MINUTES = 5;
const LISTING_TTL_HOURS = 24;
const IDEMPOTENCY_LOCK_SEED = 2026082201;

interface IslandRow extends Record<string, unknown> {
  islandId: string;
  ownerPlayerId: string;
  name: string;
  state: "creating" | "active" | "resetting" | "disabled";
  role: "owner" | "manager" | "member";
  level: number;
  experience: number;
  storageCapacity: number;
  version: number;
  memberCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface PlayerRow extends Record<string, unknown> {
  playerId: string;
  playerName: string | null;
  coins: number;
}

interface StorageRow extends Record<string, unknown> {
  id: string;
  ownerPlayerId: string;
  islandId: string;
  itemId: string;
  quantity: number;
  reservedQuantity: number;
  version: number;
  updatedAt: Date | string;
}

interface ListingRow extends Record<string, unknown> {
  id: string;
  sellerPlayerId: string;
  buyerPlayerId: string | null;
  sellerIslandId: string;
  buyerIslandId: string | null;
  storageItemId: string;
  itemId: string;
  quantity: number;
  priceCoins: number;
  feeCoins: number;
  netCoins: number;
  status: "active" | "sold" | "cancelled" | "expired";
  version: number;
  sellerDisplayName?: string | null;
  createdAt: Date | string;
  expiresAt: Date | string;
  resolvedAt: Date | string | null;
}

interface QuoteRow extends Record<string, unknown> {
  id: string;
  sellerPlayerId: string;
  islandId: string;
  storageItemId: string;
  itemId: string;
  quantity: number;
  priceCoins: number;
  feeCoins: number;
  netCoins: number;
  inventoryVersion: number;
  expiresAt: Date | string;
  consumedAt: Date | string | null;
}

interface InventoryTransferRow extends Record<string, unknown> {
  id: string;
  itemId: string;
  quantity: number;
  state: "prepared" | "marked" | "committed" | "cancelled";
  createdAt: Date | string;
  updatedAt: Date | string;
  committedAt: Date | string | null;
}

interface IdempotencyRow extends Record<string, unknown> {
  requestHash: string;
  responseStatus: number;
  responseBody: Record<string, unknown>;
}

export interface SkyblockInventoryQuery {
  cursor: string | null;
  pageSize: number;
  category: SkyblockCategory | null;
  marketable: boolean | null;
}

export interface SkyblockMarketQuery {
  cursor: string | null;
  pageSize: number;
  itemId: string | null;
  category: SkyblockCategory | null;
  rarity: SkyblockRarity | null;
  minPrice: number | null;
  maxPrice: number | null;
  sort: "recent" | "price_asc" | "price_desc";
}

export interface SkyblockListingsQuery {
  cursor: string | null;
  pageSize: number;
  status: "active" | "sold" | "cancelled" | "expired" | "all";
}

function number(value: unknown) {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) {
    throw skyblockError(500, "SKYBLOCK_DATA_INVALID", "Skyblock data is invalid");
  }
  return result;
}

function iso(value: Date | string | null) {
  return value === null ? null : new Date(value).toISOString();
}

function itemView(itemId: string) {
  const item = skyblockCatalogItem(itemId);
  if (!item) return undefined;
  return {
    itemId: item.id,
    name: item.name,
    category: item.category,
    rarity: item.rarity,
  };
}

function activeListingStatus(row: ListingRow) {
  return row.status === "active" && new Date(row.expiresAt).getTime() <= Date.now()
    ? "expired"
    : row.status;
}

function listingView(row: ListingRow, mine = false) {
  const item = itemView(row.itemId);
  if (!item) throw skyblockError(500, "SKYBLOCK_DATA_INVALID", "Unknown Skyblock item");
  return {
    listingId: row.id,
    item,
    quantity: number(row.quantity),
    priceCoins: number(row.priceCoins),
    ...(mine ? { feeCoins: number(row.feeCoins), netCoins: number(row.netCoins) } : {}),
    ...(mine ? {} : { sellerDisplayName: row.sellerDisplayName ?? "Skyblock player" }),
    ...(mine ? { status: activeListingStatus(row) } : {}),
    createdAt: iso(row.createdAt),
    expiresAt: iso(row.expiresAt),
    ...(mine ? { resolvedAt: iso(row.resolvedAt) } : {}),
  };
}

async function activeIsland(
  tx: MobileDbTransaction,
  playerId: string,
  lock = false,
) {
  const lockClause = lock ? sql`FOR UPDATE OF island, membership` : sql``;
  const rows = await tx.execute<IslandRow>(sql`
    SELECT island.id AS "islandId",
           island.owner_player_id AS "ownerPlayerId",
           island.name,
           island.state,
           membership.role,
           island.level,
           island.experience,
           island.storage_capacity AS "storageCapacity",
           island.version,
           (SELECT count(*)::int FROM skyblock_island_members member_count
             WHERE member_count.island_id = island.id) AS "memberCount",
           island.created_at AS "createdAt",
           island.updated_at AS "updatedAt"
      FROM skyblock_island_members membership
      JOIN skyblock_islands island ON island.id = membership.island_id
     WHERE membership.player_id = ${playerId}
       AND island.state = 'active'
     LIMIT 1
     ${lockClause}
  `);
  return rows[0] ?? null;
}

async function requireActiveIsland(tx: MobileDbTransaction, playerId: string, lock = false) {
  const island = await activeIsland(tx, playerId, lock);
  if (!island) throw skyblockError(409, "ISLAND_REQUIRED", "Active Skyblock island required");
  return island;
}

function requireMarketRole(island: IslandRow) {
  if (island.role !== "owner") {
    throw skyblockError(403, "ISLAND_OWNER_REQUIRED", "Only the island owner can sell shared storage");
  }
}

async function lockPlayers(tx: MobileDbTransaction, playerIds: string[]) {
  const ids = [...new Set(playerIds)].sort();
  const rows = await tx.execute<PlayerRow>(sql`
    SELECT id AS "playerId", name AS "playerName", coins
      FROM playerdata
     WHERE id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
     ORDER BY id
     FOR UPDATE
  `);
  if (rows.length !== ids.length) {
    throw skyblockError(409, "PLAYER_UNAVAILABLE", "Player is unavailable");
  }
  return new Map(rows.map((row) => [row.playerId, row]));
}

async function idempotentRequest(
  tx: MobileDbTransaction,
  playerId: string,
  scope: string,
  key: string,
  requestHash: string,
) {
  await tx.execute(sql`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${`${playerId}:${scope}:${key}`}, ${IDEMPOTENCY_LOCK_SEED})
    )
  `);
  const rows = await tx.execute<IdempotencyRow>(sql`
    SELECT request_hash AS "requestHash",
           response_status AS "responseStatus",
           response_body AS "responseBody"
      FROM skyblock_mobile_requests
     WHERE player_id = ${playerId}
       AND scope = ${scope}
       AND idempotency_key = ${key}
     LIMIT 1
     FOR UPDATE
  `);
  const existing = rows[0];
  if (existing && existing.requestHash !== requestHash) {
    throw skyblockError(409, "IDEMPOTENCY_CONFLICT", "Idempotency key already used");
  }
  return existing ?? null;
}

async function saveIdempotentResponse(
  tx: MobileDbTransaction,
  playerId: string,
  scope: string,
  key: string,
  requestHash: string,
  responseStatus: number,
  responseBody: Record<string, unknown>,
) {
  await tx.execute(sql`
    INSERT INTO skyblock_mobile_requests
      (player_id, scope, idempotency_key, request_hash, response_status, response_body, created_at)
    VALUES (
      ${playerId}, ${scope}, ${key}, ${requestHash}, ${responseStatus},
      ${JSON.stringify(responseBody)}::jsonb, now()
    )
  `);
}

function catalogIds(filters: {
  itemId?: string | null;
  category?: SkyblockCategory | null;
  rarity?: SkyblockRarity | null;
  marketable?: boolean | null;
}) {
  return SKYBLOCK_ITEM_CATALOG.filter((item) =>
    (!filters.itemId || item.id === filters.itemId)
    && (!filters.category || item.category === filters.category)
    && (!filters.rarity || item.rarity === filters.rarity)
    && (filters.marketable === null || filters.marketable === undefined || item.tradeable === filters.marketable)
  ).map((item) => item.id);
}

function idsClause(column: ReturnType<typeof sql>, ids: string[]) {
  return ids.length
    ? sql`${column} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`
    : sql`false`;
}

export async function skyblockOverview(firebaseUid: string, marketWritesEnabled: boolean) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const players = await tx.execute<PlayerRow>(sql`
      SELECT id AS "playerId", name AS "playerName", coins
        FROM playerdata WHERE id = ${actor.playerId} LIMIT 1
    `);
    const player = players[0];
    if (!player) throw skyblockError(428, "PRIMARY_LINK_REQUIRED", "Primary player link required");
    const island = await activeIsland(tx, actor.playerId);
    if (!island) {
      return {
        schemaVersion: 1,
        catalogVersion: SKYBLOCK_CATALOG_VERSION,
        player: { playerId: actor.playerId, playerName: actor.playerName, coins: number(player.coins) },
        island: null,
        progression: { level: 1, experience: 0, collectionsUnlocked: 0, questsCompleted: 0 },
        inventorySummary: { stacks: 0, totalItems: 0, capacity: 0 },
        listingCounts: { active: 0, sold: 0, cancelled: 0 },
        marketWritesEnabled,
      };
    }
    const aggregates = await tx.execute<Record<string, unknown>>(sql`
      SELECT
        (SELECT count(*)::int FROM skyblock_storage_items item
          WHERE item.island_id = ${island.islandId} AND item.quantity > 0) AS stacks,
        (SELECT COALESCE(sum(item.quantity), 0)::bigint FROM skyblock_storage_items item
          WHERE item.island_id = ${island.islandId}) AS "totalItems",
        (SELECT count(*)::int FROM skyblock_quest_progress quest
          WHERE quest.player_id = ${actor.playerId} AND quest.completed_at IS NOT NULL) AS "questsCompleted",
        (SELECT count(*)::int FROM skyblock_market_listings listing
          WHERE listing.seller_player_id = ${actor.playerId}
            AND listing.status = 'active' AND listing.expires_at > now()) AS active,
        (SELECT count(*)::int FROM skyblock_market_listings listing
          WHERE listing.seller_player_id = ${actor.playerId} AND listing.status = 'sold') AS sold,
        (SELECT count(*)::int FROM skyblock_market_listings listing
          WHERE listing.seller_player_id = ${actor.playerId}
            AND listing.status IN ('cancelled', 'expired')) AS cancelled
    `);
    const summary = aggregates[0] ?? {};
    return {
      schemaVersion: 1,
      catalogVersion: SKYBLOCK_CATALOG_VERSION,
      player: {
        playerId: actor.playerId,
        playerName: player.playerName ?? actor.playerName,
        coins: number(player.coins),
      },
      island: {
        islandId: island.islandId,
        name: island.name,
        role: island.role,
        level: number(island.level),
        experience: number(island.experience),
        membersCount: number(island.memberCount),
        createdAt: iso(island.createdAt),
        updatedAt: iso(island.updatedAt),
      },
      progression: {
        level: number(island.level),
        experience: number(island.experience),
        collectionsUnlocked: 0,
        questsCompleted: number(summary.questsCompleted ?? 0),
      },
      inventorySummary: {
        stacks: number(summary.stacks ?? 0),
        totalItems: number(summary.totalItems ?? 0),
        capacity: number(island.storageCapacity),
      },
      listingCounts: {
        active: number(summary.active ?? 0),
        sold: number(summary.sold ?? 0),
        cancelled: number(summary.cancelled ?? 0),
      },
      marketWritesEnabled,
    };
  });
}

export async function skyblockInventory(firebaseUid: string, query: SkyblockInventoryQuery) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const island = await activeIsland(tx, actor.playerId);
    if (!island) return { items: [], nextCursor: null, revision: 0 };
    const cursor = decodeSkyblockCursor(query.cursor);
    const cursorDate = cursor && typeof cursor.value === "string" ? new Date(cursor.value) : null;
    if (cursorDate && Number.isNaN(cursorDate.getTime())) {
      throw skyblockError(400, "INVALID_REQUEST", "Invalid cursor");
    }
    const ids = catalogIds({ category: query.category, marketable: query.marketable });
    const rows = await tx.execute<StorageRow>(sql`
      SELECT item.id,
             item.owner_player_id AS "ownerPlayerId",
             item.island_id AS "islandId",
             item.item_id AS "itemId",
             item.quantity,
             item.reserved_quantity AS "reservedQuantity",
             item.version,
             item.updated_at AS "updatedAt"
        FROM skyblock_storage_items item
       WHERE item.island_id = ${island.islandId}
         AND item.quantity > 0
         AND ${idsClause(sql`item.item_id`, ids)}
         ${cursorDate && cursor ? sql`AND (item.updated_at, item.id) < (${cursorDate}, ${cursor.id})` : sql``}
       ORDER BY item.updated_at DESC, item.id DESC
       LIMIT ${query.pageSize + 1}
    `);
    const page = rows.slice(0, query.pageSize);
    const items = page.map((row) => {
      const catalog = skyblockCatalogItem(row.itemId);
      const available = number(row.quantity) - number(row.reservedQuantity);
      const marketable = catalog?.tradeable === true && available > 0;
      return {
        inventoryItemId: row.id,
        itemId: row.itemId,
        name: catalog?.name ?? "Unknown item",
        description: catalog ? `${catalog.name} Skyblock resource.` : "Unavailable item.",
        category: catalog?.category ?? "unknown",
        rarity: catalog?.rarity ?? "common",
        quantity: available,
        marketable,
        marketableReason: marketable ? null : catalog ? "fully_reserved" : "unknown_item",
        revision: number(row.version),
      };
    });
    const last = page.at(-1);
    return {
      items,
      nextCursor: rows.length > query.pageSize && last
        ? encodeSkyblockCursor({ value: iso(last.updatedAt)!, id: last.id })
        : null,
      revision: page.reduce((maximum, row) => Math.max(maximum, number(row.version)), 0),
    };
  });
}

/** Privacy-safe transfer history for the authenticated account export. */
export async function skyblockInventoryTransferHistory(firebaseUid: string) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const rows = await tx.execute<InventoryTransferRow>(sql`
      SELECT transfer.id,
             transfer.item_id AS "itemId",
             transfer.quantity,
             transfer.state,
             transfer.created_at AS "createdAt",
             transfer.updated_at AS "updatedAt",
             transfer.committed_at AS "committedAt"
        FROM skyblock_inventory_transfers transfer
       WHERE transfer.player_id = ${actor.playerId}
       ORDER BY transfer.created_at DESC, transfer.id DESC
    `);
    return rows.map((row) => ({
      transferId: row.id,
      item: itemView(row.itemId) ?? {
        itemId: row.itemId,
        name: "Unknown item",
        category: "unknown",
        rarity: "common",
      },
      quantity: number(row.quantity),
      state: row.state,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
      committedAt: iso(row.committedAt),
    }));
  });
}

export async function skyblockMarket(firebaseUid: string, query: SkyblockMarketQuery) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const cursor = decodeSkyblockCursor(query.cursor);
    const ids = catalogIds({ itemId: query.itemId, category: query.category, rarity: query.rarity, marketable: true });
    const order = query.sort === "price_asc"
      ? sql`listing.price_coins ASC, listing.id ASC`
      : query.sort === "price_desc"
        ? sql`listing.price_coins DESC, listing.id DESC`
        : sql`listing.created_at DESC, listing.id DESC`;
    let cursorClause = sql``;
    if (cursor) {
      if (query.sort === "recent") {
        if (typeof cursor.value !== "string" || Number.isNaN(new Date(cursor.value).getTime())) {
          throw skyblockError(400, "INVALID_REQUEST", "Invalid cursor");
        }
        cursorClause = sql`AND (listing.created_at, listing.id) < (${new Date(cursor.value)}, ${cursor.id})`;
      } else {
        if (typeof cursor.value !== "number") throw skyblockError(400, "INVALID_REQUEST", "Invalid cursor");
        cursorClause = query.sort === "price_asc"
          ? sql`AND (listing.price_coins, listing.id) > (${cursor.value}, ${cursor.id})`
          : sql`AND (listing.price_coins, listing.id) < (${cursor.value}, ${cursor.id})`;
      }
    }
    const rows = await tx.execute<ListingRow>(sql`
      SELECT listing.id,
             listing.seller_player_id AS "sellerPlayerId",
             listing.buyer_player_id AS "buyerPlayerId",
             listing.seller_island_id AS "sellerIslandId",
             listing.buyer_island_id AS "buyerIslandId",
             listing.storage_item_id AS "storageItemId",
             listing.item_id AS "itemId",
             listing.quantity,
             listing.price_coins AS "priceCoins",
             listing.fee_coins AS "feeCoins",
             listing.net_coins AS "netCoins",
             listing.status,
             listing.version,
             seller.name AS "sellerDisplayName",
             listing.created_at AS "createdAt",
             listing.expires_at AS "expiresAt",
             listing.resolved_at AS "resolvedAt"
        FROM skyblock_market_listings listing
        JOIN playerdata seller ON seller.id = listing.seller_player_id
       WHERE listing.status = 'active'
         AND listing.expires_at > now()
         AND listing.seller_player_id <> ${actor.playerId}
         AND ${idsClause(sql`listing.item_id`, ids)}
         ${query.minPrice !== null ? sql`AND listing.price_coins >= ${query.minPrice}` : sql``}
         ${query.maxPrice !== null ? sql`AND listing.price_coins <= ${query.maxPrice}` : sql``}
         ${cursorClause}
       ORDER BY ${order}
       LIMIT ${query.pageSize + 1}
    `);
    const page = rows.slice(0, query.pageSize);
    const last = page.at(-1);
    return {
      items: page.map((row) => listingView(row)),
      nextCursor: rows.length > query.pageSize && last
        ? encodeSkyblockCursor({
          value: query.sort === "recent" ? iso(last.createdAt)! : number(last.priceCoins),
          id: last.id,
        })
        : null,
    };
  });
}

export async function skyblockListings(firebaseUid: string, query: SkyblockListingsQuery) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const cursor = decodeSkyblockCursor(query.cursor);
    const cursorDate = cursor && typeof cursor.value === "string" ? new Date(cursor.value) : null;
    if (cursorDate && Number.isNaN(cursorDate.getTime())) {
      throw skyblockError(400, "INVALID_REQUEST", "Invalid cursor");
    }
    const statusClause = query.status === "all"
      ? sql``
      : query.status === "active"
        ? sql`AND listing.status = 'active' AND listing.expires_at > now()`
        : query.status === "expired"
          ? sql`AND (listing.status = 'expired' OR (listing.status = 'active' AND listing.expires_at <= now()))`
          : sql`AND listing.status = ${query.status}`;
    const rows = await tx.execute<ListingRow>(sql`
      SELECT listing.id,
             listing.seller_player_id AS "sellerPlayerId",
             listing.buyer_player_id AS "buyerPlayerId",
             listing.seller_island_id AS "sellerIslandId",
             listing.buyer_island_id AS "buyerIslandId",
             listing.storage_item_id AS "storageItemId",
             listing.item_id AS "itemId",
             listing.quantity,
             listing.price_coins AS "priceCoins",
             listing.fee_coins AS "feeCoins",
             listing.net_coins AS "netCoins",
             listing.status,
             listing.version,
             listing.created_at AS "createdAt",
             listing.expires_at AS "expiresAt",
             listing.resolved_at AS "resolvedAt"
        FROM skyblock_market_listings listing
       WHERE listing.seller_player_id = ${actor.playerId}
         ${statusClause}
         ${cursorDate && cursor ? sql`AND (listing.created_at, listing.id) < (${cursorDate}, ${cursor.id})` : sql``}
       ORDER BY listing.created_at DESC, listing.id DESC
       LIMIT ${query.pageSize + 1}
    `);
    const page = rows.slice(0, query.pageSize);
    const last = page.at(-1);
    return {
      items: page.map((row) => listingView(row, true)),
      nextCursor: rows.length > query.pageSize && last
        ? encodeSkyblockCursor({ value: iso(last.createdAt)!, id: last.id })
        : null,
    };
  });
}

export async function createSkyblockListingQuote(
  firebaseUid: string,
  input: { inventoryItemId: string; quantity: number; priceCoins: number },
) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    await lockPlayers(tx, [actor.playerId]);
    const island = await requireActiveIsland(tx, actor.playerId, true);
    requireMarketRole(island);
    const rows = await tx.execute<StorageRow>(sql`
      SELECT item.id,
             item.owner_player_id AS "ownerPlayerId",
             item.island_id AS "islandId",
             item.item_id AS "itemId",
             item.quantity,
             item.reserved_quantity AS "reservedQuantity",
             item.version,
             item.updated_at AS "updatedAt"
        FROM skyblock_storage_items item
       WHERE item.id = ${input.inventoryItemId}
         AND item.island_id = ${island.islandId}
       LIMIT 1
       FOR UPDATE
    `);
    const storage = rows[0];
    if (!storage) throw skyblockError(404, "NOT_FOUND", "Inventory item not found");
    const catalog = skyblockCatalogItem(storage.itemId);
    if (!catalog?.tradeable) throw skyblockError(409, "ITEM_NOT_MARKETABLE", "Item is not marketable");
    if (
      input.quantity > catalog.maxStack
      || input.priceCoins < catalog.minListingCoins
      || input.priceCoins > catalog.maxListingCoins
    ) {
      throw skyblockError(400, "INVALID_REQUEST", "Listing is outside catalog limits");
    }
    if (number(storage.quantity) - number(storage.reservedQuantity) < input.quantity) {
      throw skyblockError(409, "INVENTORY_CHANGED", "Inventory quantity changed");
    }
    const feeCoins = Math.max(1, Math.floor((input.priceCoins * LISTING_FEE_BPS) / 10_000));
    const quotes = await tx.execute<QuoteRow>(sql`
      INSERT INTO skyblock_market_quotes
        (id, seller_player_id, island_id, storage_item_id, item_id, quantity,
         price_coins, fee_coins, net_coins, inventory_version, expires_at, created_at)
      VALUES
        (gen_random_uuid(), ${actor.playerId}, ${island.islandId}, ${storage.id}, ${storage.itemId},
         ${input.quantity}, ${input.priceCoins}, ${feeCoins}, ${input.priceCoins - feeCoins},
         ${storage.version}, now() + (${QUOTE_TTL_MINUTES} * interval '1 minute'), now())
      RETURNING id,
                seller_player_id AS "sellerPlayerId",
                island_id AS "islandId",
                storage_item_id AS "storageItemId",
                item_id AS "itemId",
                quantity,
                price_coins AS "priceCoins",
                fee_coins AS "feeCoins",
                net_coins AS "netCoins",
                inventory_version AS "inventoryVersion",
                expires_at AS "expiresAt",
                consumed_at AS "consumedAt"
    `);
    const quote = quotes[0]!;
    return {
      quoteId: quote.id,
      inventoryItemId: quote.storageItemId,
      itemId: quote.itemId,
      quantity: number(quote.quantity),
      priceCoins: number(quote.priceCoins),
      feeCoins: number(quote.feeCoins),
      netCoins: number(quote.netCoins),
      inventoryRevision: number(quote.inventoryVersion),
      expiresAt: iso(quote.expiresAt),
    };
  });
}

export async function createSkyblockListing(
  firebaseUid: string,
  input: { quoteId: string },
  idempotencyKey: string,
) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const scope = "skyblock:listings:create";
    const requestHash = hashSkyblockRequest(scope, input);
    await lockPlayers(tx, [actor.playerId]);
    const existing = await idempotentRequest(tx, actor.playerId, scope, idempotencyKey, requestHash);
    if (existing) return { data: existing.responseBody, created: false };

    const islandSnapshot = await requireActiveIsland(tx, actor.playerId);
    requireMarketRole(islandSnapshot);
    const island = await requireActiveIsland(tx, actor.playerId, true);
    requireMarketRole(island);
    const quotes = await tx.execute<QuoteRow>(sql`
      SELECT id,
             seller_player_id AS "sellerPlayerId",
             island_id AS "islandId",
             storage_item_id AS "storageItemId",
             item_id AS "itemId",
             quantity,
             price_coins AS "priceCoins",
             fee_coins AS "feeCoins",
             net_coins AS "netCoins",
             inventory_version AS "inventoryVersion",
             expires_at AS "expiresAt",
             consumed_at AS "consumedAt"
        FROM skyblock_market_quotes
       WHERE id = ${input.quoteId}
       LIMIT 1
       FOR UPDATE
    `);
    const quote = quotes[0];
    if (!quote || quote.sellerPlayerId !== actor.playerId || quote.islandId !== island.islandId) {
      throw skyblockError(404, "NOT_FOUND", "Listing quote not found");
    }
    if (quote.consumedAt) throw skyblockError(409, "QUOTE_ALREADY_USED", "Listing quote already used");
    if (new Date(quote.expiresAt).getTime() <= Date.now()) {
      throw skyblockError(409, "QUOTE_EXPIRED", "Listing quote expired");
    }
    const storageRows = await tx.execute<StorageRow>(sql`
      SELECT id,
             owner_player_id AS "ownerPlayerId",
             island_id AS "islandId",
             item_id AS "itemId",
             quantity,
             reserved_quantity AS "reservedQuantity",
             version,
             updated_at AS "updatedAt"
        FROM skyblock_storage_items
       WHERE id = ${quote.storageItemId}
       LIMIT 1
       FOR UPDATE
    `);
    const storage = storageRows[0];
    if (
      !storage
      || storage.islandId !== island.islandId
      || storage.itemId !== quote.itemId
      || number(storage.version) !== number(quote.inventoryVersion)
      || number(storage.quantity) - number(storage.reservedQuantity) < number(quote.quantity)
    ) {
      throw skyblockError(409, "INVENTORY_CHANGED", "Inventory changed after quote");
    }
    const listings = await tx.execute<ListingRow>(sql`
      INSERT INTO skyblock_market_listings
        (id, seller_player_id, seller_island_id, storage_item_id, item_id, quantity,
         price_coins, fee_coins, net_coins, status, version, created_at, expires_at)
      VALUES
        (gen_random_uuid(), ${actor.playerId}, ${island.islandId}, ${storage.id}, ${quote.itemId},
         ${quote.quantity}, ${quote.priceCoins}, ${quote.feeCoins}, ${quote.netCoins}, 'active', 1,
         now(), now() + (${LISTING_TTL_HOURS} * interval '1 hour'))
      RETURNING id,
                seller_player_id AS "sellerPlayerId",
                buyer_player_id AS "buyerPlayerId",
                seller_island_id AS "sellerIslandId",
                buyer_island_id AS "buyerIslandId",
                storage_item_id AS "storageItemId",
                item_id AS "itemId",
                quantity,
                price_coins AS "priceCoins",
                fee_coins AS "feeCoins",
                net_coins AS "netCoins",
                status,
                version,
                created_at AS "createdAt",
                expires_at AS "expiresAt",
                resolved_at AS "resolvedAt"
    `);
    await tx.execute(sql`
      UPDATE skyblock_storage_items
         SET reserved_quantity = reserved_quantity + ${quote.quantity},
             version = version + 1,
             updated_at = now()
       WHERE id = ${storage.id}
    `);
    await tx.execute(sql`
      UPDATE skyblock_market_quotes SET consumed_at = now() WHERE id = ${quote.id}
    `);
    const data = listingView(listings[0]!, true);
    await saveIdempotentResponse(tx, actor.playerId, scope, idempotencyKey, requestHash, 201, data);
    return { data, created: true };
  });
}

async function listingSnapshot(tx: MobileDbTransaction, listingId: string) {
  const rows = await tx.execute<ListingRow>(sql`
    SELECT id,
           seller_player_id AS "sellerPlayerId",
           buyer_player_id AS "buyerPlayerId",
           seller_island_id AS "sellerIslandId",
           buyer_island_id AS "buyerIslandId",
           storage_item_id AS "storageItemId",
           item_id AS "itemId",
           quantity,
           price_coins AS "priceCoins",
           fee_coins AS "feeCoins",
           net_coins AS "netCoins",
           status,
           version,
           created_at AS "createdAt",
           expires_at AS "expiresAt",
           resolved_at AS "resolvedAt"
      FROM skyblock_market_listings
     WHERE id = ${listingId}
     LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function cancelSkyblockListing(
  firebaseUid: string,
  listingId: string,
  idempotencyKey: string,
) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const scope = `skyblock:listings:${listingId}:cancel`;
    const requestHash = hashSkyblockRequest(scope, {});
    const snapshot = await listingSnapshot(tx, listingId);
    if (!snapshot || snapshot.sellerPlayerId !== actor.playerId) {
      throw skyblockError(404, "NOT_FOUND", "Listing not found");
    }
    await lockPlayers(tx, [actor.playerId]);
    const existing = await idempotentRequest(tx, actor.playerId, scope, idempotencyKey, requestHash);
    if (existing) return { data: existing.responseBody, created: false };
    const islandSnapshot = await requireActiveIsland(tx, actor.playerId);
    if (islandSnapshot.islandId !== snapshot.sellerIslandId) {
      throw skyblockError(409, "ISLAND_CHANGED", "Listing belongs to another island");
    }
    const island = await requireActiveIsland(tx, actor.playerId, true);
    if (island.islandId !== snapshot.sellerIslandId) {
      throw skyblockError(409, "ISLAND_CHANGED", "Listing belongs to another island");
    }
    const listingRows = await tx.execute<ListingRow>(sql`
      SELECT id,
             seller_player_id AS "sellerPlayerId",
             buyer_player_id AS "buyerPlayerId",
             seller_island_id AS "sellerIslandId",
             buyer_island_id AS "buyerIslandId",
             storage_item_id AS "storageItemId",
             item_id AS "itemId",
             quantity,
             price_coins AS "priceCoins",
             fee_coins AS "feeCoins",
             net_coins AS "netCoins",
             status,
             version,
             created_at AS "createdAt",
             expires_at AS "expiresAt",
             resolved_at AS "resolvedAt"
        FROM skyblock_market_listings
       WHERE id = ${listingId}
       LIMIT 1
       FOR UPDATE
    `);
    const listing = listingRows[0];
    if (!listing || listing.sellerPlayerId !== actor.playerId) {
      throw skyblockError(404, "NOT_FOUND", "Listing not found");
    }
    if (listing.status === "sold") {
      throw skyblockError(409, "LISTING_ALREADY_RESOLVED", "Listing is already sold");
    }
    if (listing.status === "active") {
      const storageRows = await tx.execute<StorageRow>(sql`
        SELECT id,
               owner_player_id AS "ownerPlayerId",
               island_id AS "islandId",
               item_id AS "itemId",
               quantity,
               reserved_quantity AS "reservedQuantity",
               version,
               updated_at AS "updatedAt"
          FROM skyblock_storage_items
         WHERE id = ${listing.storageItemId}
         LIMIT 1
         FOR UPDATE
      `);
      const storage = storageRows[0];
      if (!storage || number(storage.reservedQuantity) < number(listing.quantity)) {
        throw skyblockError(409, "INVENTORY_CHANGED", "Reserved inventory is unavailable");
      }
      await tx.execute(sql`
        UPDATE skyblock_storage_items
           SET reserved_quantity = reserved_quantity - ${listing.quantity},
               version = version + 1,
               updated_at = now()
         WHERE id = ${storage.id}
      `);
      const terminalStatus = new Date(listing.expiresAt).getTime() <= Date.now() ? "expired" : "cancelled";
      const updated = await tx.execute<ListingRow>(sql`
        UPDATE skyblock_market_listings
           SET status = ${terminalStatus}, version = version + 1, resolved_at = now()
         WHERE id = ${listing.id}
         RETURNING id,
                   seller_player_id AS "sellerPlayerId",
                   buyer_player_id AS "buyerPlayerId",
                   seller_island_id AS "sellerIslandId",
                   buyer_island_id AS "buyerIslandId",
                   storage_item_id AS "storageItemId",
                   item_id AS "itemId",
                   quantity,
                   price_coins AS "priceCoins",
                   fee_coins AS "feeCoins",
                   net_coins AS "netCoins",
                   status,
                   version,
                   created_at AS "createdAt",
                   expires_at AS "expiresAt",
                   resolved_at AS "resolvedAt"
      `);
      Object.assign(listing, updated[0]);
    }
    const data = listingView(listing, true);
    await saveIdempotentResponse(tx, actor.playerId, scope, idempotencyKey, requestHash, 200, data);
    return { data, created: true };
  });
}

export async function purchaseSkyblockListing(
  firebaseUid: string,
  listingId: string,
  input: { expectedPriceCoins: number },
  idempotencyKey: string,
) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const scope = `skyblock:listings:${listingId}:purchase`;
    const requestHash = hashSkyblockRequest(scope, input);
    const snapshot = await listingSnapshot(tx, listingId);
    if (!snapshot) throw skyblockError(404, "NOT_FOUND", "Listing not found");
    if (snapshot.sellerPlayerId === actor.playerId) {
      throw skyblockError(409, "SELF_PURCHASE", "Cannot purchase your own listing");
    }

    const buyerIsland = await requireActiveIsland(tx, actor.playerId);
    if (buyerIsland.islandId === snapshot.sellerIslandId) {
      throw skyblockError(409, "SAME_ISLAND_PURCHASE", "Cannot purchase from the same island");
    }
    const players = await lockPlayers(tx, [actor.playerId, snapshot.sellerPlayerId]);
    const existing = await idempotentRequest(tx, actor.playerId, scope, idempotencyKey, requestHash);
    if (existing) return { data: existing.responseBody, created: false };
    const islandIds = [...new Set([buyerIsland.islandId, snapshot.sellerIslandId])].sort();
    const lockedIslands = await tx.execute<{
      islandId: string;
      ownerPlayerId: string;
      state: string;
      storageCapacity: number;
    } & Record<string, unknown>>(sql`
      SELECT id AS "islandId", owner_player_id AS "ownerPlayerId", state,
             storage_capacity AS "storageCapacity"
        FROM skyblock_islands
       WHERE id IN (${sql.join(islandIds.map((id) => sql`${id}`), sql`, `)})
       ORDER BY id
       FOR UPDATE
    `);
    if (lockedIslands.length !== islandIds.length || !lockedIslands.some((row) =>
      row.islandId === buyerIsland.islandId && row.state === "active"
    )) {
      throw skyblockError(409, "ISLAND_REQUIRED", "Active buyer island required");
    }
    const listingRows = await tx.execute<ListingRow>(sql`
      SELECT id,
             seller_player_id AS "sellerPlayerId",
             buyer_player_id AS "buyerPlayerId",
             seller_island_id AS "sellerIslandId",
             buyer_island_id AS "buyerIslandId",
             storage_item_id AS "storageItemId",
             item_id AS "itemId",
             quantity,
             price_coins AS "priceCoins",
             fee_coins AS "feeCoins",
             net_coins AS "netCoins",
             status,
             version,
             created_at AS "createdAt",
             expires_at AS "expiresAt",
             resolved_at AS "resolvedAt"
        FROM skyblock_market_listings
       WHERE id = ${listingId}
       LIMIT 1
       FOR UPDATE
    `);
    const listing = listingRows[0];
    if (!listing || listing.status !== "active" || new Date(listing.expiresAt).getTime() <= Date.now()) {
      throw skyblockError(409, "LISTING_ALREADY_RESOLVED", "Listing is no longer available");
    }
    if (
      listing.sellerPlayerId !== snapshot.sellerPlayerId
      || listing.sellerIslandId !== snapshot.sellerIslandId
      || number(listing.priceCoins) !== input.expectedPriceCoins
    ) {
      throw skyblockError(409, "LISTING_CHANGED", "Listing changed");
    }
    const buyer = players.get(actor.playerId)!;
    const seller = players.get(listing.sellerPlayerId)!;
    const lockedBuyerIsland = lockedIslands.find((row) => row.islandId === buyerIsland.islandId)!;
    const capacityRows = await tx.execute<Record<string, unknown>>(sql`
      SELECT
        (SELECT COALESCE(sum(item.quantity), 0)::bigint
           FROM skyblock_storage_items item
          WHERE item.island_id = ${buyerIsland.islandId}) AS stored,
        (SELECT COALESCE(sum(transfer.quantity), 0)::bigint
           FROM skyblock_inventory_transfers transfer
          WHERE transfer.island_id = ${buyerIsland.islandId}
            AND transfer.state IN ('prepared', 'marked')) AS inbound
    `);
    const stored = number(capacityRows[0]?.stored ?? 0);
    const inbound = number(capacityRows[0]?.inbound ?? 0);
    const capacityAfterPurchase = stored + inbound + number(listing.quantity);
    if (!Number.isSafeInteger(capacityAfterPurchase)) {
      throw skyblockError(500, "SKYBLOCK_DATA_INVALID", "Skyblock capacity is invalid");
    }
    if (capacityAfterPurchase > number(lockedBuyerIsland.storageCapacity)) {
      throw skyblockError(409, "STORAGE_CAPACITY_EXCEEDED", "Buyer island storage is full");
    }
    if (number(buyer.coins) < number(listing.priceCoins)) {
      throw skyblockError(409, "INSUFFICIENT_COINS", "Not enough coins");
    }

    const storageRows = await tx.execute<StorageRow>(sql`
      SELECT id,
             owner_player_id AS "ownerPlayerId",
             island_id AS "islandId",
             item_id AS "itemId",
             quantity,
             reserved_quantity AS "reservedQuantity",
             version,
             updated_at AS "updatedAt"
        FROM skyblock_storage_items
       WHERE id = ${listing.storageItemId}
          OR (island_id = ${buyerIsland.islandId} AND item_id = ${listing.itemId})
       ORDER BY id
       FOR UPDATE
    `);
    const sellerStorage = storageRows.find((row) => row.id === listing.storageItemId);
    const buyerStorage = storageRows.find((row) =>
      row.islandId === buyerIsland.islandId && row.itemId === listing.itemId
    );
    if (
      !sellerStorage
      || sellerStorage.islandId !== listing.sellerIslandId
      || number(sellerStorage.quantity) < number(listing.quantity)
      || number(sellerStorage.reservedQuantity) < number(listing.quantity)
    ) {
      throw skyblockError(409, "INVENTORY_CHANGED", "Reserved inventory is unavailable");
    }
    await tx.execute(sql`
      UPDATE skyblock_storage_items
         SET quantity = quantity - ${listing.quantity},
             reserved_quantity = reserved_quantity - ${listing.quantity},
             version = version + 1,
             updated_at = now()
       WHERE id = ${sellerStorage.id}
    `);
    if (buyerStorage) {
      await tx.execute(sql`
        UPDATE skyblock_storage_items
           SET quantity = quantity + ${listing.quantity},
               version = version + 1,
               updated_at = now()
         WHERE id = ${buyerStorage.id}
      `);
    } else {
      await tx.execute(sql`
        INSERT INTO skyblock_storage_items
          (id, owner_player_id, island_id, item_id, quantity, reserved_quantity, version, created_at, updated_at)
        VALUES
          (gen_random_uuid(), ${lockedBuyerIsland.ownerPlayerId}, ${buyerIsland.islandId}, ${listing.itemId},
           ${listing.quantity}, 0, 1, now(), now())
      `);
    }

    await tx.execute(sql`
      INSERT INTO skyblock_quest_progress
        (player_id, quest_id, progress, completed_at, updated_at)
      VALUES
        (${listing.sellerPlayerId}, 'market_seller', 1, now(), now())
      ON CONFLICT (player_id, quest_id) DO UPDATE
        SET progress = GREATEST(skyblock_quest_progress.progress, 1),
            completed_at = COALESCE(skyblock_quest_progress.completed_at, now()),
            updated_at = now()
      WHERE skyblock_quest_progress.completed_at IS NULL
    `);

    const buyerBalance = number(buyer.coins) - number(listing.priceCoins);
    const sellerBalance = number(seller.coins) + number(listing.netCoins);
    await tx.execute(sql`UPDATE playerdata SET coins = ${buyerBalance} WHERE id = ${actor.playerId}`);
    await tx.execute(sql`UPDATE playerdata SET coins = ${sellerBalance} WHERE id = ${listing.sellerPlayerId}`);
    await tx.execute(sql`
      INSERT INTO coin_transactions (id, player_id, amount, source, created_at)
      VALUES
        (gen_random_uuid(), ${actor.playerId}, ${-number(listing.priceCoins)}, ${`skyblock:market:${listing.id}:buyer`}, now()),
        (gen_random_uuid(), ${listing.sellerPlayerId}, ${number(listing.netCoins)}, ${`skyblock:market:${listing.id}:seller`}, now())
    `);
    const sales = await tx.execute<{ id: string; createdAt: Date | string } & Record<string, unknown>>(sql`
      INSERT INTO skyblock_market_sales
        (id, listing_id, buyer_player_id, seller_player_id, buyer_island_id, seller_island_id,
         item_id, quantity, price_coins, fee_coins, net_coins, created_at)
      VALUES
        (gen_random_uuid(), ${listing.id}, ${actor.playerId}, ${listing.sellerPlayerId},
         ${buyerIsland.islandId}, ${listing.sellerIslandId}, ${listing.itemId}, ${listing.quantity},
         ${listing.priceCoins}, ${listing.feeCoins}, ${listing.netCoins}, now())
      RETURNING id, created_at AS "createdAt"
    `);
    await tx.execute(sql`
      UPDATE skyblock_market_listings
         SET status = 'sold',
             buyer_player_id = ${actor.playerId},
             buyer_island_id = ${buyerIsland.islandId},
             version = version + 1,
             resolved_at = now()
       WHERE id = ${listing.id}
    `);
    const item = itemView(listing.itemId)!;
    const data = {
      purchaseId: sales[0]!.id,
      listingId: listing.id,
      item,
      quantity: number(listing.quantity),
      priceCoins: number(listing.priceCoins),
      balanceCoins: buyerBalance,
      purchasedAt: iso(sales[0]!.createdAt),
    };
    await saveIdempotentResponse(tx, actor.playerId, scope, idempotencyKey, requestHash, 201, data);
    return { data, created: true };
  });
}
