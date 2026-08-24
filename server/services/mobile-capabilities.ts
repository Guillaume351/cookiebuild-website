import { sql } from "drizzle-orm";
import { createError } from "h3";
import db from "../../db/client";

export type MobileCapability =
  | "kitShop"
  | "playerDashboard"
  | "skyblockCompanion"
  | "skyblockManagementWrites"
  | "skyblockMarketWrites";

interface CapabilityRow extends Record<string, unknown> {
  kitShop: boolean;
  playerDashboard: boolean;
  skyblockCompanion: boolean;
  skyblockManagementWrites: boolean;
  skyblockMarketWrites: boolean;
}

export interface MobileCapabilities {
  kitShop: boolean;
  playerDashboard: boolean;
  skyblockCompanion: boolean;
  skyblockManagementWrites: boolean;
  skyblockMarketWrites: boolean;
}

let cachedSchema: { expiresAt: number; value: MobileCapabilities } | undefined;

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function configuredMobileCapabilities(
  environment = process.env,
): MobileCapabilities {
  const skyblockCompanion = enabled(environment.MOBILE_SKYBLOCK_ENABLED);
  return {
    kitShop: enabled(environment.MOBILE_KIT_SHOP_ENABLED),
    playerDashboard: enabled(environment.MOBILE_PLAYER_DASHBOARD_ENABLED),
    skyblockCompanion,
    skyblockManagementWrites:
      skyblockCompanion &&
      enabled(environment.MOBILE_SKYBLOCK_MANAGEMENT_WRITES_ENABLED),
    skyblockMarketWrites:
      skyblockCompanion &&
      enabled(environment.MOBILE_SKYBLOCK_MARKET_WRITES_ENABLED),
  };
}

async function databaseCapabilities(): Promise<MobileCapabilities> {
  const rows = await db.execute<CapabilityRow>(sql`
    SELECT (
      to_regclass('public.coin_transactions') IS NOT NULL
      AND to_regclass('public.uq_coin_transaction_player_source') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'playerdata' AND column_name = 'coins'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'minigame_progression'
           AND column_name = 'updated_at'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'minigame_progression'
           AND column_name = 'last_progress_at'
      )
    ) AS "kitShop",
    (
      to_regclass('public.mobile_player_links') IS NOT NULL
      AND to_regclass('public.player_sessions') IS NOT NULL
      AND to_regclass('public.matches') IS NOT NULL
      AND to_regclass('public.match_players') IS NOT NULL
      AND to_regclass('public.match_winners') IS NOT NULL
      AND to_regclass('public.player_match_performances') IS NOT NULL
      AND to_regclass('public.minigame_progression') IS NOT NULL
      AND to_regclass('public.idx_match_players_player_match') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'playerdata' AND column_name = 'coins'
      )
    ) AS "playerDashboard",
    (
      to_regclass('public.skyblock_islands') IS NOT NULL
      AND to_regclass('public.skyblock_island_members') IS NOT NULL
      AND to_regclass('public.skyblock_skill_progress') IS NOT NULL
      AND to_regclass('public.skyblock_quest_progress') IS NOT NULL
      AND to_regclass('public.skyblock_workers') IS NOT NULL
      AND to_regclass('public.skyblock_storage_items') IS NOT NULL
      AND to_regclass('public.skyblock_inventory_transfers') IS NOT NULL
      AND to_regclass('public.skyblock_island_accounts') IS NOT NULL
      AND to_regclass('public.skyblock_coin_transactions') IS NOT NULL
      AND to_regclass('public.skyblock_collections') IS NOT NULL
      AND to_regclass('public.skyblock_periodic_objectives') IS NOT NULL
      AND to_regclass('public.idx_skyblock_transfer_recovery') IS NOT NULL
      AND to_regclass('public.uq_skyblock_open_transfer_player') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'skyblock_islands'
           AND column_name IN ('state', 'visibility', 'version')
         GROUP BY table_name HAVING count(*) = 3
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'skyblock_storage_items'
           AND column_name IN ('quantity', 'reserved_quantity', 'version')
         GROUP BY table_name HAVING count(*) = 3
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'skyblock_inventory_transfers'
           AND column_name IN ('state', 'direction', 'updated_at', 'committed_at')
         GROUP BY table_name HAVING count(*) = 4
      )
    ) AS "skyblockCompanion",
    (
      to_regclass('public.skyblock_islands') IS NOT NULL
      AND to_regclass('public.skyblock_island_members') IS NOT NULL
      AND to_regclass('public.skyblock_island_invites') IS NOT NULL
      AND to_regclass('public.uq_skyblock_pending_invite') IS NOT NULL
      AND to_regclass('public.skyblock_quest_progress') IS NOT NULL
      AND to_regclass('public.skyblock_workers') IS NOT NULL
      AND to_regclass('public.skyblock_storage_items') IS NOT NULL
      AND to_regclass('public.skyblock_inventory_transfers') IS NOT NULL
      AND to_regclass('public.skyblock_mobile_requests') IS NOT NULL
      AND to_regclass('public.skyblock_island_accounts') IS NOT NULL
      AND to_regclass('public.skyblock_coin_transactions') IS NOT NULL
      AND to_regclass('public.skyblock_npc_trade_daily') IS NOT NULL
      AND to_regclass('public.skyblock_collections') IS NOT NULL
      AND to_regclass('public.skyblock_periodic_objectives') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'skyblock_islands'
           AND column_name IN ('generator_tier', 'build_radius', 'storage_capacity', 'member_limit', 'version')
         GROUP BY table_name HAVING count(*) = 5
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'skyblock_island_members'
           AND column_name IN ('island_id', 'player_id', 'role')
         GROUP BY table_name HAVING count(*) = 3
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'skyblock_island_invites'
           AND column_name IN ('invitee_player_id', 'status', 'expires_at', 'resolved_at')
         GROUP BY table_name HAVING count(*) = 4
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'skyblock_quest_progress'
           AND column_name IN ('progress', 'completed_at', 'claimed_at', 'updated_at')
         GROUP BY table_name HAVING count(*) = 4
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'skyblock_workers'
           AND column_name IN ('worker_type', 'tier', 'status', 'buffer_item_id', 'buffer_quantity', 'production_cursor_at')
         GROUP BY table_name HAVING count(*) = 6
      )
    ) AS "skyblockManagementWrites",
    (
      to_regclass('public.skyblock_market_quotes') IS NOT NULL
      AND to_regclass('public.skyblock_market_listings') IS NOT NULL
      AND to_regclass('public.skyblock_market_sales') IS NOT NULL
      AND to_regclass('public.skyblock_mobile_requests') IS NOT NULL
      AND to_regclass('public.skyblock_island_accounts') IS NOT NULL
      AND to_regclass('public.skyblock_coin_transactions') IS NOT NULL
    ) AS "skyblockMarketWrites"
  `);
  return {
    kitShop: rows[0]?.kitShop === true,
    playerDashboard: rows[0]?.playerDashboard === true,
    skyblockCompanion: rows[0]?.skyblockCompanion === true,
    skyblockManagementWrites: rows[0]?.skyblockManagementWrites === true,
    skyblockMarketWrites: rows[0]?.skyblockMarketWrites === true,
  };
}

/** Runtime flags and schema prerequisites must both pass before an API is advertised. */
export async function mobileCapabilities(
  now = Date.now(),
): Promise<MobileCapabilities> {
  const configured = configuredMobileCapabilities();
  if (
    !configured.kitShop &&
    !configured.playerDashboard &&
    !configured.skyblockCompanion &&
    !configured.skyblockManagementWrites &&
    !configured.skyblockMarketWrites
  )
    return configured;

  if (!cachedSchema || cachedSchema.expiresAt <= now) {
    try {
      cachedSchema = {
        value: await databaseCapabilities(),
        expiresAt: now + 60_000,
      };
    } catch (error) {
      console.warn(
        "[mobile-capabilities] schema check failed; private features remain disabled",
        error,
      );
      cachedSchema = {
        value: {
          kitShop: false,
          playerDashboard: false,
          skyblockCompanion: false,
          skyblockManagementWrites: false,
          skyblockMarketWrites: false,
        },
        expiresAt: now + 10_000,
      };
    }
  }
  return {
    kitShop: configured.kitShop && cachedSchema.value.kitShop,
    playerDashboard:
      configured.playerDashboard && cachedSchema.value.playerDashboard,
    skyblockCompanion:
      configured.skyblockCompanion && cachedSchema.value.skyblockCompanion,
    skyblockManagementWrites:
      configured.skyblockManagementWrites &&
      cachedSchema.value.skyblockCompanion &&
      cachedSchema.value.skyblockManagementWrites,
    skyblockMarketWrites:
      configured.skyblockMarketWrites &&
      cachedSchema.value.skyblockCompanion &&
      cachedSchema.value.skyblockMarketWrites,
  };
}

export async function requireMobileCapability(capability: MobileCapability) {
  const capabilities = await mobileCapabilities();
  if (!capabilities[capability]) {
    throw createError({
      statusCode: 404,
      statusMessage: "Feature unavailable",
    });
  }
}

export function resetMobileCapabilityCacheForTests() {
  cachedSchema = undefined;
}
