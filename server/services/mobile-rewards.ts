import { sql } from "drizzle-orm";
import { createError } from "h3";
import db from "../../db/client";
import {
  addDaysToDateKey,
  nextParisMidnight,
  parisDateKey,
} from "../utils/paris-time";
import { lockActiveMobileUser, type MobileDbTransaction } from "./mobile-user";

/** Granted once per Minecraft player for linking the companion app. */
export const APP_LINK_REWARD = {
  source: "app_link",
  periodKey: "once",
  coins: 150,
  cosmeticId: "app_companion_badge",
} as const;

export const DAILY_CHEST_SOURCE = "app_daily";
/** Coins for streak days 1..7; the cycle restarts at day 1 after day 7. */
export const DAILY_CHEST_REWARDS = [25, 30, 40, 50, 60, 75, 150] as const;

export interface AppLinkReward {
  coins: number;
  cosmeticId: string;
}

type Executor = Pick<typeof db, "execute"> | MobileDbTransaction;

let cachedGrantSchema: { expiresAt: number; ready: boolean } | undefined;

/**
 * Link rewards are attached inside the link transaction, so the table must exist
 * before the insert is attempted; otherwise linking itself would fail.
 */
export async function rewardGrantsReady(now = Date.now()) {
  if (cachedGrantSchema && cachedGrantSchema.expiresAt > now) return cachedGrantSchema.ready;
  try {
    const rows = await db.execute<{ ready: boolean }>(sql`
      SELECT to_regclass('public.player_reward_grants') IS NOT NULL AS ready
    `);
    cachedGrantSchema = { ready: rows[0]?.ready === true, expiresAt: now + 60_000 };
  } catch {
    cachedGrantSchema = { ready: false, expiresAt: now + 10_000 };
  }
  return cachedGrantSchema.ready;
}

export function resetRewardSchemaCacheForTests() {
  cachedGrantSchema = undefined;
}

/** Inserts the one-time link grant; null when the player already received it. */
export async function grantAppLinkRewardInTransaction(
  tx: Executor,
  playerId: string,
): Promise<AppLinkReward | null> {
  const rows = await tx.execute<{ id: string }>(sql`
    INSERT INTO player_reward_grants (player_uuid, source, period_key, coins, xp, cosmetic_id)
    VALUES (${playerId}, ${APP_LINK_REWARD.source}, ${APP_LINK_REWARD.periodKey},
            ${APP_LINK_REWARD.coins}, 0, ${APP_LINK_REWARD.cosmeticId})
    ON CONFLICT (player_uuid, source, period_key) DO NOTHING
    RETURNING id
  `);
  return rows.length
    ? { coins: APP_LINK_REWARD.coins, cosmeticId: APP_LINK_REWARD.cosmeticId }
    : null;
}

export function dailyChestCycleDay(streak: number) {
  return ((Math.max(1, Math.floor(streak)) - 1) % DAILY_CHEST_REWARDS.length) + 1;
}

export function dailyChestCoins(day: number) {
  return DAILY_CHEST_REWARDS[dailyChestCycleDay(day) - 1]!;
}

export function dailyChestRewardTable() {
  return DAILY_CHEST_REWARDS.map((coins, index) => ({ day: index + 1, coins }));
}

export interface LatestDailyClaim {
  claimDate: string;
  streak: number;
}

/**
 * Pure streak rules. `streak` is the live consecutive-day count (0 once a day is
 * missed) and `currentDay` is the reward day claimable today, or claimed today.
 */
export function dailyChestProgress(todayKey: string, latest: LatestDailyClaim | null) {
  if (latest?.claimDate === todayKey) {
    return {
      claimedToday: true,
      streak: latest.streak,
      currentDay: dailyChestCycleDay(latest.streak),
    };
  }
  const alive = latest?.claimDate === addDaysToDateKey(todayKey, -1) ? latest.streak : 0;
  return {
    claimedToday: false,
    streak: alive,
    currentDay: dailyChestCycleDay(alive + 1),
  };
}

async function primaryPlayerId(executor: Executor, firebaseUid: string) {
  const rows = await executor.execute<{ playerId: string }>(sql`
    SELECT link.player_id AS "playerId"
      FROM mobile_player_links link
      JOIN playerdata player ON player.id = link.player_id
     WHERE link.firebase_uid = ${firebaseUid}
       AND link.is_primary
       AND link.revoked_at IS NULL
     LIMIT 1
  `);
  return rows[0]?.playerId ?? null;
}

async function latestClaim(executor: Executor, playerId: string, todayKey: string) {
  const rows = await executor.execute<{ claimDate: string; streak: number }>(sql`
    SELECT to_char(claim_date, 'YYYY-MM-DD') AS "claimDate", streak
      FROM mobile_daily_claims
     WHERE player_id = ${playerId}
       AND claim_date <= ${todayKey}::date
     ORDER BY claim_date DESC
     LIMIT 1
  `);
  const row = rows[0];
  return row ? { claimDate: row.claimDate, streak: Number(row.streak) } : null;
}

export async function dailyChestStatus(firebaseUid: string, now = new Date()) {
  const todayKey = parisDateKey(now);
  const base = {
    nextResetAt: nextParisMidnight(now).toISOString(),
    rewards: dailyChestRewardTable(),
  };
  const playerId = await primaryPlayerId(db, firebaseUid);
  if (!playerId) {
    return {
      linked: false,
      available: false,
      claimedToday: false,
      streak: 0,
      currentDay: 1,
      ...base,
    };
  }
  const progress = dailyChestProgress(todayKey, await latestClaim(db, playerId, todayKey));
  return {
    linked: true,
    available: !progress.claimedToday,
    claimedToday: progress.claimedToday,
    streak: progress.streak,
    currentDay: progress.currentDay,
    ...base,
  };
}

export async function claimDailyChest(firebaseUid: string, now = new Date()) {
  const todayKey = parisDateKey(now);
  return db.transaction(async (tx) => {
    await lockActiveMobileUser(tx, firebaseUid);
    const playerId = await primaryPlayerId(tx, firebaseUid);
    if (!playerId) {
      throw createError({ statusCode: 403, statusMessage: "Link a Minecraft player to open the daily chest" });
    }
    const progress = dailyChestProgress(todayKey, await latestClaim(tx, playerId, todayKey));
    if (progress.claimedToday) {
      throw createError({ statusCode: 409, statusMessage: "Daily chest already claimed today" });
    }
    const streak = progress.streak + 1;
    const day = dailyChestCycleDay(streak);
    const coins = dailyChestCoins(day);

    // The primary key serializes concurrent claims for the same player and day.
    const claimed = await tx.execute<{ playerId: string }>(sql`
      INSERT INTO mobile_daily_claims (player_id, claim_date, streak, cycle_day, coins)
      VALUES (${playerId}, ${todayKey}::date, ${streak}, ${day}, ${coins})
      ON CONFLICT (player_id, claim_date) DO NOTHING
      RETURNING player_id AS "playerId"
    `);
    if (!claimed.length) {
      throw createError({ statusCode: 409, statusMessage: "Daily chest already claimed today" });
    }
    const grants = await tx.execute<{ id: string }>(sql`
      INSERT INTO player_reward_grants (player_uuid, source, period_key, coins, xp)
      VALUES (${playerId}, ${DAILY_CHEST_SOURCE}, ${todayKey}, ${coins}, 0)
      ON CONFLICT (player_uuid, source, period_key) DO NOTHING
      RETURNING id
    `);
    const grantId = grants[0]?.id;
    if (!grantId) {
      throw createError({ statusCode: 409, statusMessage: "Daily chest already claimed today" });
    }
    await tx.execute(sql`
      UPDATE mobile_daily_claims SET grant_id = ${grantId}
       WHERE player_id = ${playerId} AND claim_date = ${todayKey}::date
    `);
    return {
      granted: { coins, day },
      streak,
      currentDay: day,
      claimedToday: true,
      nextResetAt: nextParisMidnight(now).toISOString(),
    };
  });
}
