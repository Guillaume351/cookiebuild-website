import { sql } from "drizzle-orm";
import { createError } from "h3";
import db from "../../db/client";

export type MobileCapability = "kitShop" | "playerDashboard";

interface CapabilityRow extends Record<string, unknown> {
  kitShop: boolean;
  playerDashboard: boolean;
}

export interface MobileCapabilities {
  kitShop: boolean;
  playerDashboard: boolean;
}

let cachedSchema: { expiresAt: number; value: MobileCapabilities } | undefined;

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function configuredMobileCapabilities(environment = process.env): MobileCapabilities {
  return {
    kitShop: enabled(environment.MOBILE_KIT_SHOP_ENABLED),
    playerDashboard: enabled(environment.MOBILE_PLAYER_DASHBOARD_ENABLED),
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
    ) AS "playerDashboard"
  `);
  return {
    kitShop: rows[0]?.kitShop === true,
    playerDashboard: rows[0]?.playerDashboard === true,
  };
}

/** Runtime flags and schema prerequisites must both pass before an API is advertised. */
export async function mobileCapabilities(now = Date.now()): Promise<MobileCapabilities> {
  const configured = configuredMobileCapabilities();
  if (!configured.kitShop && !configured.playerDashboard) return configured;

  if (!cachedSchema || cachedSchema.expiresAt <= now) {
    try {
      cachedSchema = { value: await databaseCapabilities(), expiresAt: now + 60_000 };
    } catch (error) {
      console.warn("[mobile-capabilities] schema check failed; private features remain disabled", error);
      cachedSchema = {
        value: { kitShop: false, playerDashboard: false },
        expiresAt: now + 10_000,
      };
    }
  }
  return {
    kitShop: configured.kitShop && cachedSchema.value.kitShop,
    playerDashboard: configured.playerDashboard && cachedSchema.value.playerDashboard,
  };
}

export async function requireMobileCapability(capability: MobileCapability) {
  const capabilities = await mobileCapabilities();
  if (!capabilities[capability]) {
    throw createError({ statusCode: 404, statusMessage: "Feature unavailable" });
  }
}

export function resetMobileCapabilityCacheForTests() {
  cachedSchema = undefined;
}
