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
  SKYBLOCK_MANAGEMENT_POLICY_VERSION,
  SKYBLOCK_MAX_GENERATOR_TIER,
  SKYBLOCK_QUESTS,
  SKYBLOCK_WORKER_STATUSES,
  SKYBLOCK_WORKER_POLICY,
  SKYBLOCK_WORKER_TYPES,
  skyblockBuildRadiusForTier,
  skyblockGeneratorUpgradeCost,
  skyblockQuest,
  type SkyblockWorkerStatus,
  type SkyblockWorkerType,
} from "./mobile-skyblock-management-policy";
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
  generatorTier: number;
  buildRadius: number;
  memberLimit: number;
  visibility: "private" | "invite_only";
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

interface WorkerRow extends Record<string, unknown> {
  id: string;
  workerType: SkyblockWorkerType;
  tier: number;
  status: SkyblockWorkerStatus;
  bufferItemId: string;
  bufferQuantity: number;
  productionCursorAt: Date | string;
  updatedAt: Date | string;
}

interface QuestProgressRow extends Record<string, unknown> {
  questId: string;
  progress: number;
  completedAt: Date | string | null;
  claimedAt: Date | string | null;
}

interface MemberRow extends Record<string, unknown> {
  playerId: string;
  displayName: string | null;
  role: "owner" | "manager" | "member";
  joinedAt: Date | string;
}

interface PendingInviteRow extends Record<string, unknown> {
  inviteId: string;
  islandId: string;
  islandName: string;
  inviterPlayerId: string;
  inviterDisplayName: string | null;
  expiresAt: Date | string;
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
           island.generator_tier AS "generatorTier",
           island.build_radius AS "buildRadius",
           island.member_limit AS "memberLimit",
           island.visibility,
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

function requireManagementRole(island: IslandRow) {
  if (island.role === "member") {
    throw skyblockError(403, "ISLAND_ROLE_REQUIRED", "Owner or manager role required");
  }
}

function workerProduction(row: WorkerRow, now: Date) {
  const tier = number(row.tier);
  if (tier < 1 || tier > 5) {
    throw skyblockError(500, "SKYBLOCK_DATA_INVALID", "Skyblock worker tier is invalid");
  }
  const cursor = new Date(row.productionCursorAt);
  if (Number.isNaN(cursor.getTime()) || now.getTime() < cursor.getTime()) {
    throw skyblockError(500, "SKYBLOCK_DATA_INVALID", "Skyblock worker cursor is invalid");
  }
  const creditedSeconds = Math.min(
    SKYBLOCK_WORKER_POLICY.offlineCapHours * 60 * 60,
    Math.floor((now.getTime() - cursor.getTime()) / 1_000),
  );
  const intervalSeconds = SKYBLOCK_WORKER_POLICY.tiers.find((candidate) => candidate.tier === tier)?.intervalSeconds;
  if (!intervalSeconds) throw skyblockError(500, "SKYBLOCK_DATA_INVALID", "Skyblock worker policy is invalid");
  const produced = Math.min(
    Math.floor(creditedSeconds / intervalSeconds),
    tier * SKYBLOCK_WORKER_POLICY.tierBufferCapacityMultiplier,
  );
  return {
    quantity: produced,
    nextCursor: new Date(now.getTime() - (creditedSeconds % intervalSeconds) * 1_000),
  };
}

function workerView(row: WorkerRow, now: Date, overrides?: { bufferQuantity: number; cursor: Date }) {
  if (!SKYBLOCK_WORKER_TYPES.includes(row.workerType) || !SKYBLOCK_WORKER_STATUSES.includes(row.status)) {
    throw skyblockError(500, "SKYBLOCK_DATA_INVALID", "Skyblock worker type or status is invalid");
  }
  const item = itemView(row.bufferItemId);
  if (!item) throw skyblockError(500, "SKYBLOCK_DATA_INVALID", "Unknown Skyblock worker item");
  const production = overrides ? { quantity: 0 } : workerProduction(row, now);
  const bufferQuantity = overrides?.bufferQuantity ?? number(row.bufferQuantity);
  const estimatedReadyQuantity = bufferQuantity + production.quantity;
  if (!Number.isSafeInteger(estimatedReadyQuantity)) {
    throw skyblockError(500, "SKYBLOCK_DATA_INVALID", "Skyblock worker quantity is invalid");
  }
  return {
    workerId: row.id,
    type: row.workerType,
    tier: number(row.tier),
    status: row.status,
    item,
    bufferQuantity,
    estimatedReadyQuantity,
    productionCursorAt: iso(overrides?.cursor ?? row.productionCursorAt),
    updatedAt: iso(row.updatedAt),
  };
}

async function recordManagementQuestEvent(
  tx: MobileDbTransaction,
  playerId: string,
  event: string,
  subject: string,
  amount: number,
) {
  const absoluteEvents = new Set([
    "visit",
    "upgrade_generator",
    "skill_level",
    "island_level",
    "coop_member",
    "skill_total",
  ]);
  const completed: string[] = [];
  for (const quest of SKYBLOCK_QUESTS) {
    if (quest.event !== event || (quest.subject !== subject && quest.subject !== "any")) continue;
    const progress = Math.min(quest.target, amount);
    const accumulated = absoluteEvents.has(event)
      ? sql`GREATEST(skyblock_quest_progress.progress, EXCLUDED.progress)`
      : sql`skyblock_quest_progress.progress + EXCLUDED.progress`;
    const rows = await tx.execute<{ completedAt: Date | string | null } & Record<string, unknown>>(sql`
      INSERT INTO skyblock_quest_progress
        (player_id, quest_id, progress, completed_at, updated_at)
      VALUES
        (${playerId}, ${quest.id}, ${progress},
         CASE WHEN ${progress} >= ${quest.target} THEN now() ELSE NULL END, now())
      ON CONFLICT (player_id, quest_id) DO UPDATE
        SET progress = LEAST(${quest.target}, ${accumulated}),
            completed_at = CASE
              WHEN LEAST(${quest.target}, ${accumulated}) >= ${quest.target}
                THEN COALESCE(skyblock_quest_progress.completed_at, now())
              ELSE skyblock_quest_progress.completed_at
            END,
            updated_at = now()
      WHERE skyblock_quest_progress.completed_at IS NULL
      RETURNING completed_at AS "completedAt"
    `);
    if (rows[0]?.completedAt) completed.push(quest.id);
  }
  return completed;
}

async function pendingInvite(tx: MobileDbTransaction, playerId: string, lock = false) {
  const lockClause = lock ? sql`FOR UPDATE OF invite` : sql``;
  const rows = await tx.execute<PendingInviteRow>(sql`
    SELECT invite.id AS "inviteId",
           invite.island_id AS "islandId",
           island.name AS "islandName",
           invite.inviter_player_id AS "inviterPlayerId",
           inviter.name AS "inviterDisplayName",
           invite.expires_at AS "expiresAt"
      FROM skyblock_island_invites invite
      JOIN skyblock_islands island ON island.id = invite.island_id
      JOIN playerdata inviter ON inviter.id = invite.inviter_player_id
     WHERE invite.invitee_player_id = ${playerId}
       AND invite.status = 'pending'
       AND invite.expires_at > now()
     ORDER BY invite.created_at DESC, invite.id
     LIMIT 1
     ${lockClause}
  `);
  return rows[0] ?? null;
}

async function managementWorkers(tx: MobileDbTransaction, islandId: string, lock = false) {
  const lockClause = lock ? sql`FOR UPDATE` : sql``;
  return tx.execute<WorkerRow>(sql`
    SELECT id,
           worker_type AS "workerType",
           tier,
           status,
           buffer_item_id AS "bufferItemId",
           buffer_quantity AS "bufferQuantity",
           production_cursor_at AS "productionCursorAt",
           updated_at AS "updatedAt"
      FROM skyblock_workers
     WHERE island_id = ${islandId}
     ORDER BY id
     ${lockClause}
  `);
}

export async function skyblockManagementOverview(
  firebaseUid: string,
  managementWritesEnabled: boolean,
) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const players = await tx.execute<PlayerRow>(sql`
      SELECT id AS "playerId", name AS "playerName", coins
        FROM playerdata
       WHERE id = ${actor.playerId}
       LIMIT 1
    `);
    const player = players[0];
    if (!player) throw skyblockError(428, "PRIMARY_LINK_REQUIRED", "Primary player link required");
    const island = await activeIsland(tx, actor.playerId);
    const invite = island ? null : await pendingInvite(tx, actor.playerId);
    const base = {
      schemaVersion: 1,
      policyVersion: SKYBLOCK_MANAGEMENT_POLICY_VERSION,
      managementWritesEnabled,
      player: {
        playerId: actor.playerId,
        playerName: player.playerName ?? actor.playerName,
        coins: number(player.coins),
      },
    };
    if (!island) {
      return {
        ...base,
        island: null,
        generator: null,
        workers: [],
        quests: [],
        coop: {
          members: [],
          pendingInvite: invite ? {
            inviteId: invite.inviteId,
            islandName: invite.islandName,
            inviterDisplayName: invite.inviterDisplayName ?? "Skyblock player",
            expiresAt: iso(invite.expiresAt),
          } : null,
        },
      };
    }
    const [storageRows, workers, questRows, members] = await Promise.all([
      tx.execute<Record<string, unknown>>(sql`
        SELECT
          (SELECT COALESCE(sum(item.quantity), 0)::bigint
             FROM skyblock_storage_items item WHERE item.island_id = ${island.islandId}) AS "usedItems",
          (SELECT COALESCE(sum(transfer.quantity), 0)::bigint
             FROM skyblock_inventory_transfers transfer
            WHERE transfer.island_id = ${island.islandId}
              AND transfer.state IN ('prepared', 'marked')) AS "reservedTransfers"
      `),
      managementWorkers(tx, island.islandId),
      tx.execute<QuestProgressRow>(sql`
        SELECT quest_id AS "questId", progress,
               completed_at AS "completedAt", claimed_at AS "claimedAt"
          FROM skyblock_quest_progress
         WHERE player_id = ${actor.playerId}
      `),
      tx.execute<MemberRow>(sql`
        SELECT member.player_id AS "playerId", player.name AS "displayName",
               member.role, member.joined_at AS "joinedAt"
          FROM skyblock_island_members member
          JOIN playerdata player ON player.id = member.player_id
         WHERE member.island_id = ${island.islandId}
         ORDER BY CASE member.role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END,
                  lower(player.name), member.player_id
      `),
    ]);
    const progress = new Map(questRows.map((row) => [row.questId, row]));
    const nextTier = number(island.generatorTier) + 1;
    const nextUpgrade = nextTier <= SKYBLOCK_MAX_GENERATOR_TIER ? {
      tier: nextTier,
      costCoins: skyblockGeneratorUpgradeCost(nextTier),
      buildRadius: skyblockBuildRadiusForTier(nextTier),
    } : null;
    const storage = storageRows[0] ?? {};
    const now = new Date();
    return {
      ...base,
      island: {
        islandId: island.islandId,
        name: island.name,
        role: island.role,
        version: number(island.version),
        level: number(island.level),
        experience: number(island.experience),
        generatorTier: number(island.generatorTier),
        buildRadius: number(island.buildRadius),
        storage: {
          usedItems: number(storage.usedItems ?? 0),
          reservedTransfers: number(storage.reservedTransfers ?? 0),
          capacity: number(island.storageCapacity),
        },
        memberLimit: number(island.memberLimit),
        visibility: island.visibility,
      },
      generator: {
        tier: number(island.generatorTier),
        maxTier: SKYBLOCK_MAX_GENERATOR_TIER,
        buildRadius: number(island.buildRadius),
        nextUpgrade,
        canUpgrade: Boolean(
          managementWritesEnabled
          && island.role !== "member"
          && nextUpgrade
          && number(player.coins) >= nextUpgrade.costCoins
        ),
      },
      workers: workers.map((worker) => workerView(worker, now)),
      quests: SKYBLOCK_QUESTS.map((quest) => {
        const row = progress.get(quest.id);
        const completed = Boolean(row?.completedAt);
        const claimed = Boolean(row?.claimedAt);
        return {
          questId: quest.id,
          chapter: quest.chapter,
          progress: Math.min(quest.target, number(row?.progress ?? 0)),
          target: quest.target,
          completed,
          claimed,
          rewardCoins: quest.rewardCoins,
          claimable: managementWritesEnabled && completed && !claimed,
        };
      }),
      coop: {
        members: members.map((member) => ({
          playerId: member.playerId,
          displayName: member.displayName ?? "Skyblock player",
          role: member.role,
          joinedAt: iso(member.joinedAt),
        })),
        pendingInvite: null,
      },
    };
  });
}

export async function upgradeSkyblockGenerator(
  firebaseUid: string,
  input: { expectedIslandVersion: number; expectedNextTier: number; expectedCostCoins: number },
  idempotencyKey: string,
) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const scope = "skyblock:management:generator-upgrade";
    const requestHash = hashSkyblockRequest(scope, input);
    const players = await lockPlayers(tx, [actor.playerId]);
    const existing = await idempotentRequest(tx, actor.playerId, scope, idempotencyKey, requestHash);
    if (existing) return { data: existing.responseBody, created: false };
    const island = await requireActiveIsland(tx, actor.playerId, true);
    requireManagementRole(island);
    const currentTier = number(island.generatorTier);
    if (currentTier >= SKYBLOCK_MAX_GENERATOR_TIER) {
      throw skyblockError(409, "MAX_GENERATOR_TIER", "Generator is already at the maximum tier");
    }
    const nextTier = currentTier + 1;
    const costCoins = skyblockGeneratorUpgradeCost(nextTier);
    if (number(island.version) !== input.expectedIslandVersion) {
      throw skyblockError(409, "ISLAND_VERSION_CONFLICT", "Island changed; refresh before upgrading");
    }
    if (input.expectedNextTier !== nextTier || input.expectedCostCoins !== costCoins) {
      throw skyblockError(409, "UPGRADE_CHANGED", "Generator upgrade changed; refresh before upgrading");
    }
    const player = players.get(actor.playerId)!;
    if (number(player.coins) < costCoins) {
      throw skyblockError(409, "INSUFFICIENT_COINS", "Not enough coins");
    }
    const buildRadius = skyblockBuildRadiusForTier(nextTier);
    const balanceCoins = number(player.coins) - costCoins;
    await tx.execute(sql`
      UPDATE playerdata SET coins = ${balanceCoins} WHERE id = ${actor.playerId}
    `);
    await tx.execute(sql`
      INSERT INTO coin_transactions (id, player_id, amount, source, created_at)
      VALUES
        (gen_random_uuid(), ${actor.playerId}, ${-costCoins},
         ${`skyblock:generator:${island.islandId}:tier:${nextTier}`}, now())
    `);
    const upgraded = await tx.execute<{
      version: number;
      level: number;
      experience: number;
      generatorTier: number;
      buildRadius: number;
    } & Record<string, unknown>>(sql`
      UPDATE skyblock_islands
         SET generator_tier = ${nextTier},
             build_radius = ${buildRadius},
             level = GREATEST(level, ${nextTier}),
             experience = experience + ${costCoins},
             version = version + 1,
             updated_at = now()
       WHERE id = ${island.islandId}
         AND version = ${input.expectedIslandVersion}
      RETURNING version, level, experience,
                generator_tier AS "generatorTier", build_radius AS "buildRadius"
    `);
    if (!upgraded[0]) {
      throw skyblockError(409, "ISLAND_VERSION_CONFLICT", "Island changed; refresh before upgrading");
    }
    const questCompletions = [
      ...await recordManagementQuestEvent(tx, actor.playerId, "upgrade_generator", "tier", nextTier),
      ...await recordManagementQuestEvent(tx, actor.playerId, "island_level", "level", nextTier),
    ];
    const row = upgraded[0];
    const data = {
      island: {
        version: number(row.version),
        level: number(row.level),
        experience: number(row.experience),
        generatorTier: number(row.generatorTier),
        buildRadius: number(row.buildRadius),
      },
      coins: balanceCoins,
      costCoins,
      questCompletions: [...new Set(questCompletions)],
    };
    await saveIdempotentResponse(tx, actor.playerId, scope, idempotencyKey, requestHash, 201, data);
    return { data, created: true };
  });
}

export async function collectSkyblockWorkers(
  firebaseUid: string,
  idempotencyKey: string,
) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const scope = "skyblock:management:workers-collect";
    const body = {};
    const requestHash = hashSkyblockRequest(scope, body);
    await lockPlayers(tx, [actor.playerId]);
    const existing = await idempotentRequest(tx, actor.playerId, scope, idempotencyKey, requestHash);
    if (existing) return { data: existing.responseBody, created: false };
    const island = await requireActiveIsland(tx, actor.playerId, true);
    const transfers = await tx.execute<{ quantity: number } & Record<string, unknown>>(sql`
      SELECT quantity
        FROM skyblock_inventory_transfers
       WHERE island_id = ${island.islandId}
         AND state IN ('prepared', 'marked')
       ORDER BY id
       FOR UPDATE
    `);
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
       WHERE island_id = ${island.islandId}
       ORDER BY id
       FOR UPDATE
    `);
    const workers = await managementWorkers(tx, island.islandId, true);
    const usedBefore = storageRows.reduce((sum, row) => sum + number(row.quantity), 0);
    const reservedTransfers = transfers.reduce((sum, row) => sum + number(row.quantity), 0);
    let available = Math.max(0, number(island.storageCapacity) - usedBefore - reservedTransfers);
    const now = new Date();
    const collected = new Map<string, number>();
    const updatedWorkers: ReturnType<typeof workerView>[] = [];
    const storageByItem = new Map(storageRows.map((row) => [row.itemId, row]));
    for (const worker of workers) {
      const production = workerProduction(worker, now);
      const ready = number(worker.bufferQuantity) + production.quantity;
      if (!Number.isSafeInteger(ready)) {
        throw skyblockError(500, "SKYBLOCK_DATA_INVALID", "Skyblock worker quantity is invalid");
      }
      const accepted = Math.min(ready, available);
      const remaining = ready - accepted;
      if (accepted > 0) {
        const storage = storageByItem.get(worker.bufferItemId);
        if (storage) {
          await tx.execute(sql`
            UPDATE skyblock_storage_items
               SET quantity = quantity + ${accepted},
                   version = version + 1,
                   updated_at = now()
             WHERE id = ${storage.id}
          `);
          storage.quantity = number(storage.quantity) + accepted;
        } else {
          const inserted = await tx.execute<StorageRow>(sql`
            INSERT INTO skyblock_storage_items
              (id, owner_player_id, island_id, item_id, quantity, reserved_quantity, version, created_at, updated_at)
            VALUES
              (gen_random_uuid(), ${island.ownerPlayerId}, ${island.islandId}, ${worker.bufferItemId},
               ${accepted}, 0, 1, now(), now())
            RETURNING id, owner_player_id AS "ownerPlayerId", island_id AS "islandId",
                      item_id AS "itemId", quantity, reserved_quantity AS "reservedQuantity",
                      version, updated_at AS "updatedAt"
          `);
          storageByItem.set(worker.bufferItemId, inserted[0]!);
        }
        collected.set(worker.bufferItemId, (collected.get(worker.bufferItemId) ?? 0) + accepted);
        available -= accepted;
      }
      await tx.execute(sql`
        UPDATE skyblock_workers
           SET buffer_quantity = ${remaining},
               production_cursor_at = ${production.nextCursor.toISOString()},
               updated_at = now()
         WHERE id = ${worker.id}
      `);
      updatedWorkers.push(workerView({ ...worker, updatedAt: now }, now, {
        bufferQuantity: remaining,
        cursor: production.nextCursor,
      }));
    }
    const totalQuantity = [...collected.values()].reduce((sum, quantity) => sum + quantity, 0);
    const questCompletions = totalQuantity > 0
      ? await recordManagementQuestEvent(
          tx,
          actor.playerId,
          "collect_worker",
          "any",
          Math.min(2_000_000_000, totalQuantity),
        )
      : [];
    const data = {
      collected: [...collected.entries()].sort(([first], [second]) => first.localeCompare(second))
        .map(([itemId, quantity]) => ({ item: itemView(itemId)!, quantity })),
      totalQuantity,
      storage: {
        usedItems: usedBefore + totalQuantity,
        reservedTransfers,
        capacity: number(island.storageCapacity),
      },
      workers: updatedWorkers,
      questCompletions,
    };
    await saveIdempotentResponse(tx, actor.playerId, scope, idempotencyKey, requestHash, 201, data);
    return { data, created: true };
  });
}

export async function claimSkyblockQuest(
  firebaseUid: string,
  questId: string,
  idempotencyKey: string,
) {
  const quest = skyblockQuest(questId);
  if (!quest) throw skyblockError(404, "QUEST_UNKNOWN", "Unknown Skyblock quest");
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const scope = `skyblock:management:quests:${questId}:claim`;
    const body = {};
    const requestHash = hashSkyblockRequest(scope, body);
    const players = await lockPlayers(tx, [actor.playerId]);
    const existing = await idempotentRequest(tx, actor.playerId, scope, idempotencyKey, requestHash);
    if (existing) return { data: existing.responseBody, created: false };
    await requireActiveIsland(tx, actor.playerId, true);
    const progress = await tx.execute<QuestProgressRow>(sql`
      SELECT quest_id AS "questId", progress,
             completed_at AS "completedAt", claimed_at AS "claimedAt"
        FROM skyblock_quest_progress
       WHERE player_id = ${actor.playerId}
         AND quest_id = ${questId}
       LIMIT 1
       FOR UPDATE
    `);
    const row = progress[0];
    if (!row?.completedAt) throw skyblockError(409, "QUEST_INCOMPLETE", "Quest is incomplete");
    if (row.claimedAt) throw skyblockError(409, "QUEST_ALREADY_CLAIMED", "Quest reward already claimed");
    const balanceCoins = number(players.get(actor.playerId)!.coins) + quest.rewardCoins;
    if (!Number.isSafeInteger(balanceCoins) || balanceCoins > 2_147_483_647) {
      throw skyblockError(409, "COIN_BALANCE_LIMIT", "Coin balance limit reached");
    }
    await tx.execute(sql`UPDATE playerdata SET coins = ${balanceCoins} WHERE id = ${actor.playerId}`);
    await tx.execute(sql`
      INSERT INTO coin_transactions (id, player_id, amount, source, created_at)
      VALUES
        (gen_random_uuid(), ${actor.playerId}, ${quest.rewardCoins}, ${`skyblock:quest:${questId}`}, now())
    `);
    const claims = await tx.execute<{ claimedAt: Date | string } & Record<string, unknown>>(sql`
      UPDATE skyblock_quest_progress
         SET claimed_at = now(), updated_at = now()
       WHERE player_id = ${actor.playerId}
         AND quest_id = ${questId}
         AND claimed_at IS NULL
      RETURNING claimed_at AS "claimedAt"
    `);
    if (!claims[0]) throw skyblockError(409, "QUEST_ALREADY_CLAIMED", "Quest reward already claimed");
    const data = {
      questId,
      rewardCoins: quest.rewardCoins,
      coins: balanceCoins,
      claimedAt: iso(claims[0].claimedAt),
    };
    await saveIdempotentResponse(tx, actor.playerId, scope, idempotencyKey, requestHash, 201, data);
    return { data, created: true };
  });
}

export async function acceptSkyblockInvite(
  firebaseUid: string,
  inviteId: string,
  idempotencyKey: string,
) {
  return db.transaction(async (tx) => {
    const actor = await requirePrimaryLinkedPlayer(tx, firebaseUid);
    const scope = "skyblock:management:invite-accept";
    const body = { inviteId };
    const requestHash = hashSkyblockRequest(scope, body);
    const snapshots = await tx.execute<PendingInviteRow>(sql`
      SELECT invite.id AS "inviteId", invite.island_id AS "islandId", island.name AS "islandName",
             invite.inviter_player_id AS "inviterPlayerId", inviter.name AS "inviterDisplayName",
             invite.expires_at AS "expiresAt"
        FROM skyblock_island_invites invite
        JOIN skyblock_islands island ON island.id = invite.island_id
        JOIN playerdata inviter ON inviter.id = invite.inviter_player_id
       WHERE invite.id = ${inviteId}
         AND invite.invitee_player_id = ${actor.playerId}
       LIMIT 1
    `);
    const snapshot = snapshots[0];
    if (!snapshot) throw skyblockError(404, "INVITE_NOT_FOUND", "Skyblock invite not found");
    await lockPlayers(tx, [actor.playerId, snapshot.inviterPlayerId]);
    const existing = await idempotentRequest(tx, actor.playerId, scope, idempotencyKey, requestHash);
    if (existing) return { data: existing.responseBody, created: false };
    const islands = await tx.execute<{
      islandId: string;
      name: string;
      state: string;
      memberLimit: number;
      version: number;
    } & Record<string, unknown>>(sql`
      SELECT id AS "islandId", name, state, member_limit AS "memberLimit", version
        FROM skyblock_islands
       WHERE id = ${snapshot.islandId}
       LIMIT 1
       FOR UPDATE
    `);
    const island = islands[0];
    if (!island || island.state !== "active") {
      throw skyblockError(409, "INVITE_EXPIRED", "Skyblock invite is no longer available");
    }
    const invites = await tx.execute<{
      status: string;
      expiresAt: Date | string;
    } & Record<string, unknown>>(sql`
      SELECT status, expires_at AS "expiresAt"
        FROM skyblock_island_invites
       WHERE id = ${inviteId}
         AND invitee_player_id = ${actor.playerId}
       LIMIT 1
       FOR UPDATE
    `);
    const invite = invites[0];
    if (!invite || invite.status !== "pending" || new Date(invite.expiresAt).getTime() <= Date.now()) {
      throw skyblockError(409, "INVITE_EXPIRED", "Skyblock invite is no longer available");
    }
    const existingMembership = await tx.execute(sql`
      SELECT 1
        FROM skyblock_island_members
       WHERE player_id = ${actor.playerId}
       LIMIT 1
    `);
    if (existingMembership.length) {
      throw skyblockError(409, "ALREADY_IN_ISLAND", "Player already belongs to an island");
    }
    const counts = await tx.execute<{ memberCount: number } & Record<string, unknown>>(sql`
      SELECT count(*)::int AS "memberCount"
        FROM skyblock_island_members
       WHERE island_id = ${island.islandId}
    `);
    const memberCount = number(counts[0]?.memberCount ?? 0);
    if (memberCount >= number(island.memberLimit)) {
      throw skyblockError(409, "COOP_FULL", "Skyblock coop is full");
    }
    await tx.execute(sql`
      INSERT INTO skyblock_island_members (island_id, player_id, role, joined_at)
      VALUES (${island.islandId}, ${actor.playerId}, 'member', now())
    `);
    for (const skill of ["mining", "farming", "foraging", "combat"] as const) {
      await tx.execute(sql`
        INSERT INTO skyblock_skill_progress (player_id, skill)
        VALUES (${actor.playerId}, ${skill})
        ON CONFLICT (player_id, skill) DO NOTHING
      `);
    }
    await tx.execute(sql`
      UPDATE skyblock_island_invites
         SET status = 'accepted', resolved_at = now()
       WHERE id = ${inviteId}
    `);
    await recordManagementQuestEvent(
      tx,
      snapshot.inviterPlayerId,
      "coop_member",
      "count",
      memberCount + 1,
    );
    const data = {
      inviteId,
      island: {
        islandId: island.islandId,
        name: island.name,
        role: "member" as const,
        version: number(island.version),
      },
      memberCount: memberCount + 1,
    };
    await saveIdempotentResponse(tx, actor.playerId, scope, idempotencyKey, requestHash, 201, data);
    return { data, created: true };
  });
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
