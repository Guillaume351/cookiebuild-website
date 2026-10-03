import { sql } from "drizzle-orm";
import db from "../../db/client";
import {
  addDaysToDateKey,
  isoWeekdayOfDateKey,
  isoWeekKeyOfDateKey,
  parisDateKey,
  parisWallTimeToUtc,
  PARIS_TIME_ZONE,
} from "../utils/paris-time";

/**
 * Weekly Build Battle best-of (contract section 2): every Monday 10:00 Europe/Paris
 * the top 3 published builds created during the previous Paris week (likes desc,
 * then earlier creation, min 3 likes) earn 150 / 100 / 50 coins through
 * player_reward_grants (source bb_bestof, period_key "<ISO week>-<rank>").
 */
export const BB_BESTOF = {
  source: "bb_bestof",
  rewards: [150, 100, 50] as readonly number[],
  minimumLikes: 3,
  runIsoWeekday: 1,
  runHour: 10,
} as const;

export function bestOfRewardsEnabled(environment: Record<string, string | undefined> = process.env) {
  return environment.BB_GALLERY_BESTOF_REWARDS_ENABLED?.trim().toLowerCase() === "true";
}

export interface BestOfWindow {
  weekKey: string;
  startsAt: Date;
  endsAt: Date;
}

const hourFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: PARIS_TIME_ZONE, hour: "2-digit", hourCycle: "h23" });

/** The previous Paris week to reward when `now` is Monday 10:00–10:59 Paris, otherwise null. */
export function dueBestOfWindow(now: Date): BestOfWindow | null {
  const today = parisDateKey(now);
  if (isoWeekdayOfDateKey(today) !== BB_BESTOF.runIsoWeekday) return null;
  if (Number(hourFormatter.format(now)) % 24 !== BB_BESTOF.runHour) return null;
  return previousParisWeek(now);
}

/** Monday 00:00 → Monday 00:00 (Paris) of the week before the one containing `now`. */
export function previousParisWeek(now: Date): BestOfWindow {
  const today = parisDateKey(now);
  const thisMonday = addDaysToDateKey(today, 1 - isoWeekdayOfDateKey(today));
  const previousMonday = addDaysToDateKey(thisMonday, -7);
  return {
    weekKey: isoWeekKeyOfDateKey(previousMonday),
    startsAt: parisWallTimeToUtc(previousMonday, 0, 0),
    endsAt: parisWallTimeToUtc(thisMonday, 0, 0),
  };
}

export interface BestOfCandidate {
  id: string;
  playerId: string;
  likeCount: number;
  createdAt: Date;
}

/** Pure ranking rule, mirrored by the SQL below (used by tests). */
export function rankBestOf(candidates: readonly BestOfCandidate[]) {
  return [...candidates]
    .filter((candidate) => candidate.likeCount >= BB_BESTOF.minimumLikes)
    .sort((left, right) => right.likeCount - left.likeCount
      || left.createdAt.getTime() - right.createdAt.getTime()
      || left.id.localeCompare(right.id))
    .slice(0, BB_BESTOF.rewards.length)
    .map((candidate, index) => ({ ...candidate, rank: index + 1, coins: BB_BESTOF.rewards[index]! }));
}

/**
 * Idempotent per ISO week: an advisory lock serializes replicas and nothing is
 * inserted once any bb_bestof grant of that week exists.
 */
export async function grantWeeklyBestOf(window: BestOfWindow) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`bb_bestof:${window.weekKey}`}))`);
    const rows = await tx.execute<{ playerId: string; periodKey: string; coins: number }>(sql`
      WITH ranked AS (
        SELECT build.player_id,
               row_number() OVER (ORDER BY build.like_count DESC, build.created_at ASC, build.id ASC) AS rank
          FROM buildbattle_builds build
         WHERE build.status = 'published'
           AND build.created_at >= ${window.startsAt.toISOString()}::timestamptz
           AND build.created_at < ${window.endsAt.toISOString()}::timestamptz
           AND build.like_count >= ${BB_BESTOF.minimumLikes}
         ORDER BY build.like_count DESC, build.created_at ASC, build.id ASC
         LIMIT ${BB_BESTOF.rewards.length}
      )
      INSERT INTO player_reward_grants (player_uuid, source, period_key, coins, xp)
      SELECT ranked.player_id, ${BB_BESTOF.source}, ${window.weekKey} || '-' || ranked.rank,
             (${`{${BB_BESTOF.rewards.join(",")}}`}::int[])[ranked.rank::int], 0
        FROM ranked
       WHERE NOT EXISTS (
         SELECT 1 FROM player_reward_grants existing
          WHERE existing.source = ${BB_BESTOF.source}
            AND existing.period_key LIKE ${`${window.weekKey}-%`}
       )
      ON CONFLICT (player_uuid, source, period_key) DO NOTHING
      RETURNING player_uuid AS "playerId", period_key AS "periodKey", coins
    `);
    return [...rows];
  });
}

/** Called by the scheduler; returns the grants created (empty outside the Monday window). */
export async function runWeeklyBestOf(now = new Date()) {
  const window = dueBestOfWindow(now);
  if (!window) return { weekKey: null, granted: [] as Array<{ playerId: string; periodKey: string; coins: number }> };
  return { weekKey: window.weekKey, granted: await grantWeeklyBestOf(window) };
}
