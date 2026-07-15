import { sql } from "drizzle-orm";
import { createError } from "h3";
import db from "../../db/client";

interface PrimaryPlayerRow extends Record<string, unknown> {
  playerId: string;
  playerName: string | null;
}

async function primaryLinkedPlayer(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], firebaseUid: string) {
  const rows = await tx.execute<PrimaryPlayerRow>(sql`
    SELECT link.player_id AS "playerId", player.name AS "playerName"
      FROM mobile_player_links link
      JOIN playerdata player ON player.id = link.player_id
     WHERE link.firebase_uid = ${firebaseUid}
       AND link.is_primary
       AND link.revoked_at IS NULL
     LIMIT 1
  `);
  const row = rows[0];
  if (!row) throw createError({ statusCode: 428, statusMessage: "Primary player link required" });
  return { playerId: row.playerId, playerName: row.playerName ?? "Unknown player" };
}

interface ProfileRow extends Record<string, unknown> {
  playerId: string;
  playerName: string | null;
  edition: "java" | "bedrock";
  online: boolean;
  rankPosition: number | null;
  rankTotal: number;
  experience: number;
  achievements: string[];
  day: string | null;
  dailyMatches: number;
  dailyWins: number;
  week: string | null;
  weeklyMatches: number;
  weeklyWins: number;
  weeklyKills: number;
}

function nextUtcDay(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

function nextUtcWeek(now = new Date()) {
  const day = now.getUTCDay() || 7;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + (8 - day)));
}

function isoWeekKey(now: Date) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function objective(
  id: string,
  title: string,
  description: string,
  progress: number,
  target: number,
  rewardXp: number,
  rewardCoins: number,
  resetsAt: Date,
) {
  const bounded = Math.min(Math.max(0, progress), target);
  return {
    id,
    title,
    description,
    progress: bounded,
    target,
    completed: bounded >= target,
    rewardCoins,
    rewardXp,
    claimRequired: false,
    rewardDelivery: "automatic" as const,
    resetsAt: resetsAt.toISOString(),
  };
}

/** Authenticated profile, rank and the exact goal state persisted by CookieDough. */
export async function mobileEngagementSnapshot(firebaseUid: string, now = new Date()) {
  return db.transaction(async (tx) => {
    const actor = await primaryLinkedPlayer(tx, firebaseUid);
    const quarterMonth = Math.floor(now.getUTCMonth() / 3) * 3;
    const seasonStart = new Date(Date.UTC(now.getUTCFullYear(), quarterMonth, 1)).toISOString();
    const rows = await tx.execute<ProfileRow>(sql`
      WITH season_stats AS (
        SELECT player.id,
               player.name,
               count(winner.match_id)::int AS wins,
               count(played_match.id)::int AS matches,
               COALESCE((
                 SELECT sum(
                   CASE WHEN session.duration IS NOT NULL THEN session.duration
                        WHEN session.end_time IS NOT NULL
                          THEN extract(epoch FROM (session.end_time - session.start_time)) * 1000
                        ELSE extract(epoch FROM (now() - session.start_time)) * 1000 END
                 )
                   FROM player_sessions session
                  WHERE session.player_id = player.id
                    AND session.start_time >= ${seasonStart}
               ), 0) AS playtime
          FROM playerdata player
          JOIN match_players match_player ON match_player.player_id = player.id
          JOIN matches played_match
            ON played_match.id = match_player.match_id
           AND played_match.endtime IS NOT NULL
           AND played_match.starttime >= ${seasonStart}
          LEFT JOIN match_winners winner
            ON winner.player_id = player.id AND winner.match_id = played_match.id
         GROUP BY player.id, player.name
      ), ranked AS (
        SELECT season_stats.id,
               row_number() OVER (
                 ORDER BY season_stats.wins DESC,
                          season_stats.matches DESC,
                          season_stats.playtime DESC,
                          season_stats.name ASC NULLS LAST,
                          season_stats.id
               )::int AS position,
               count(*) OVER ()::int AS total
          FROM season_stats
      )
      SELECT player.id AS "playerId",
             player.name AS "playerName",
             link.edition,
             EXISTS (
               SELECT 1 FROM player_sessions session
                WHERE session.player_id = player.id AND session.end_time IS NULL
             ) AS online,
             ranked.position AS "rankPosition",
             COALESCE(ranked.total, (SELECT count(*)::int FROM ranked)) AS "rankTotal",
             COALESCE((
               SELECT sum(progression.experience)::int
                 FROM minigame_progression progression
                WHERE progression.player_id = player.id
             ), 0) AS experience,
             COALESCE(goal.achievements, '[]'::jsonb) AS achievements,
             goal.day::text AS day,
             COALESCE(goal.daily_matches, 0)::int AS "dailyMatches",
             COALESCE(goal.daily_wins, 0)::int AS "dailyWins",
             goal.week,
             COALESCE(goal.weekly_matches, 0)::int AS "weeklyMatches",
             COALESCE(goal.weekly_wins, 0)::int AS "weeklyWins",
             COALESCE(goal.weekly_kills, 0)::int AS "weeklyKills"
        FROM mobile_player_links link
        JOIN playerdata player ON player.id = link.player_id
        LEFT JOIN ranked ON ranked.id = player.id
        LEFT JOIN player_goal_progress goal ON goal.player_id = player.id
       WHERE link.firebase_uid = ${firebaseUid}
         AND link.player_id = ${actor.playerId}
         AND link.is_primary
         AND link.revoked_at IS NULL
       LIMIT 1
    `);
    const row = rows[0];
    if (!row) throw createError({ statusCode: 428, statusMessage: "Primary player link required" });

    const utcDay = now.toISOString().slice(0, 10);
    const dailyMatches = row.day === utcDay ? row.dailyMatches : 0;
    const dailyWins = row.day === utcDay ? row.dailyWins : 0;
    const currentWeek = isoWeekKey(now);
    const weeklyMatches = row.week === currentWeek ? row.weeklyMatches : 0;
    const weeklyWins = row.week === currentWeek ? row.weeklyWins : 0;
    const weeklyKills = row.week === currentWeek ? row.weeklyKills : 0;
    const dailyReset = nextUtcDay(now);
    const weeklyReset = nextUtcWeek(now);
    const experience = Math.max(0, Number(row.experience));
    const level = Math.floor(Math.sqrt(experience / 100)) + 1;
    const levelBase = ((level - 1) ** 2) * 100;
    const nextLevel = (level ** 2) * 100;
    const dailyQuests = [
      objective("daily-match", "Play a match", "Complete any Cookie Build match.", dailyMatches, 1, 20, 15, dailyReset),
      objective("daily-win", "Win a match", "Win any Cookie Build match today.", dailyWins, 1, 30, 25, dailyReset),
    ];
    const weeklyQuests = [
      objective("weekly-matches", "Play 3 matches", "Complete three matches this week.", weeklyMatches, 3, 25, 50, weeklyReset),
      objective("weekly-win", "Win a match", "Win a match this week.", weeklyWins, 1, 25, 50, weeklyReset),
      objective("weekly-kills", "Earn 10 eliminations", "Earn ten eliminations this week.", weeklyKills, 10, 40, 75, weeklyReset),
    ];
    const nextBestAction = dailyQuests.find((quest) => !quest.completed)
      ?? weeklyQuests.find((quest) => !quest.completed)
      ?? null;

    return {
      playerId: row.playerId,
      playerName: row.playerName ?? actor.playerName,
      edition: row.edition,
      online: row.online,
      rank: {
        position: row.rankPosition === null ? null : Number(row.rankPosition),
        total: Number(row.rankTotal),
        period: "season" as const,
        gamemode: "all" as const,
      },
      progression: {
        level,
        xp: experience,
        xpIntoLevel: experience - levelBase,
        xpForNextLevel: nextLevel - levelBase,
        resetTimezone: "UTC",
        daily: dailyQuests[0],
        dailyQuests,
        weeklyQuests,
        achievements: { completed: row.achievements.length, total: 3 },
        nextBestAction,
      },
    };
  });
}

interface PresenceRow extends Record<string, unknown> {
  playerId: string;
  playerName: string | null;
  online: boolean;
  lastSeenAt: Date | string | null;
  onlineAlertEnabled: boolean;
}

function presence(row: PresenceRow) {
  return {
    playerId: row.playerId,
    playerName: row.playerName ?? "Unknown player",
    online: row.online,
    lastSeenAt: row.lastSeenAt ? new Date(row.lastSeenAt).toISOString() : null,
    onlineAlertEnabled: row.onlineAlertEnabled,
  };
}

/** Presence is never public: only accepted friends and current party members are returned. */
export async function mobilePresenceSnapshot(firebaseUid: string) {
  return db.transaction(async (tx) => {
    const actor = await primaryLinkedPlayer(tx, firebaseUid);
    const friends = await tx.execute<PresenceRow>(sql`
      SELECT target.id AS "playerId",
             target.name AS "playerName",
             CASE WHEN NOT EXISTS (
               SELECT 1 FROM mobile_player_links privacy_link
               JOIN mobile_users privacy_user ON privacy_user.firebase_uid = privacy_link.firebase_uid AND privacy_user.deleted_at IS NULL
               JOIN mobile_notification_preferences privacy_pref ON privacy_pref.mobile_user_id = privacy_user.id
                WHERE privacy_link.player_id = target.id AND privacy_link.is_primary AND privacy_link.revoked_at IS NULL
                  AND privacy_pref.online_visibility = 'hidden'
             )
               THEN EXISTS (SELECT 1 FROM player_sessions session
                             WHERE session.player_id = target.id AND session.end_time IS NULL)
               ELSE false END AS online,
             CASE WHEN NOT EXISTS (
               SELECT 1 FROM mobile_player_links privacy_link
               JOIN mobile_users privacy_user ON privacy_user.firebase_uid = privacy_link.firebase_uid AND privacy_user.deleted_at IS NULL
               JOIN mobile_notification_preferences privacy_pref ON privacy_pref.mobile_user_id = privacy_user.id
                WHERE privacy_link.player_id = target.id AND privacy_link.is_primary AND privacy_link.revoked_at IS NULL
                  AND privacy_pref.online_visibility = 'hidden'
             )
               THEN (SELECT max(coalesce(session.end_time, session.start_time))
                       FROM player_sessions session WHERE session.player_id = target.id)
               ELSE NULL END AS "lastSeenAt",
             COALESCE(alert.enabled, false) AS "onlineAlertEnabled"
        FROM player_friendships friendship
        JOIN playerdata target ON target.id = CASE
          WHEN friendship.player_low_id = ${actor.playerId} THEN friendship.player_high_id
          ELSE friendship.player_low_id END
        LEFT JOIN mobile_friend_online_alerts alert
          ON alert.owner_player_id = ${actor.playerId} AND alert.target_player_id = target.id
       WHERE friendship.status = 'accepted'
         AND ${actor.playerId} IN (friendship.player_low_id, friendship.player_high_id)
         AND NOT EXISTS (
           SELECT 1 FROM player_blocks block
            WHERE (block.blocker_player_id = ${actor.playerId} AND block.blocked_player_id = target.id)
               OR (block.blocker_player_id = target.id AND block.blocked_player_id = ${actor.playerId})
         )
       ORDER BY online DESC, lower(target.name), target.id
    `);
    const partyMembers = await tx.execute<PresenceRow>(sql`
      SELECT target.id AS "playerId",
             target.name AS "playerName",
             CASE WHEN NOT EXISTS (
                    SELECT 1 FROM mobile_player_links privacy_link
                    JOIN mobile_users privacy_user ON privacy_user.firebase_uid = privacy_link.firebase_uid AND privacy_user.deleted_at IS NULL
                    JOIN mobile_notification_preferences privacy_pref ON privacy_pref.mobile_user_id = privacy_user.id
                     WHERE privacy_link.player_id = target.id AND privacy_link.is_primary AND privacy_link.revoked_at IS NULL
                       AND privacy_pref.online_visibility = 'hidden'
                  ) AND (friendship.status = 'accepted' OR NOT EXISTS (
                    SELECT 1 FROM mobile_player_links privacy_link
                    JOIN mobile_users privacy_user ON privacy_user.firebase_uid = privacy_link.firebase_uid AND privacy_user.deleted_at IS NULL
                    JOIN mobile_notification_preferences privacy_pref ON privacy_pref.mobile_user_id = privacy_user.id
                     WHERE privacy_link.player_id = target.id AND privacy_link.is_primary AND privacy_link.revoked_at IS NULL
                       AND privacy_pref.online_visibility = 'friends'
                  ))
               THEN EXISTS (SELECT 1 FROM player_sessions session
                             WHERE session.player_id = target.id AND session.end_time IS NULL)
               ELSE false END AS online,
             CASE WHEN NOT EXISTS (
                    SELECT 1 FROM mobile_player_links privacy_link
                    JOIN mobile_users privacy_user ON privacy_user.firebase_uid = privacy_link.firebase_uid AND privacy_user.deleted_at IS NULL
                    JOIN mobile_notification_preferences privacy_pref ON privacy_pref.mobile_user_id = privacy_user.id
                     WHERE privacy_link.player_id = target.id AND privacy_link.is_primary AND privacy_link.revoked_at IS NULL
                       AND privacy_pref.online_visibility = 'hidden'
                  ) AND (friendship.status = 'accepted' OR NOT EXISTS (
                    SELECT 1 FROM mobile_player_links privacy_link
                    JOIN mobile_users privacy_user ON privacy_user.firebase_uid = privacy_link.firebase_uid AND privacy_user.deleted_at IS NULL
                    JOIN mobile_notification_preferences privacy_pref ON privacy_pref.mobile_user_id = privacy_user.id
                     WHERE privacy_link.player_id = target.id AND privacy_link.is_primary AND privacy_link.revoked_at IS NULL
                       AND privacy_pref.online_visibility = 'friends'
                  ))
               THEN (SELECT max(coalesce(session.end_time, session.start_time))
                       FROM player_sessions session WHERE session.player_id = target.id)
               ELSE NULL END AS "lastSeenAt",
             COALESCE(alert.enabled, false) AS "onlineAlertEnabled"
        FROM player_party_members actor_member
        JOIN player_party_members member
          ON member.party_id = actor_member.party_id AND member.left_at IS NULL
        JOIN player_parties party ON party.id = member.party_id AND party.state = 'active'
        JOIN playerdata target ON target.id = member.player_id
        LEFT JOIN player_friendships friendship
          ON friendship.player_low_id = least(${actor.playerId}::uuid, target.id)
         AND friendship.player_high_id = greatest(${actor.playerId}::uuid, target.id)
        LEFT JOIN mobile_friend_online_alerts alert
          ON alert.owner_player_id = ${actor.playerId} AND alert.target_player_id = target.id
       WHERE actor_member.player_id = ${actor.playerId}
         AND actor_member.left_at IS NULL
         AND target.id <> ${actor.playerId}
         AND NOT EXISTS (
           SELECT 1 FROM player_blocks block
            WHERE (block.blocker_player_id = ${actor.playerId} AND block.blocked_player_id = target.id)
               OR (block.blocker_player_id = target.id AND block.blocked_player_id = ${actor.playerId})
         )
       ORDER BY online DESC, lower(target.name), target.id
    `);
    return { friends: friends.map(presence), partyMembers: partyMembers.map(presence) };
  });
}

export async function setFriendOnlineAlert(firebaseUid: string, targetPlayerId: string, enabled: boolean) {
  return db.transaction(async (tx) => {
    const actor = await primaryLinkedPlayer(tx, firebaseUid);
    const friendship = await tx.execute(sql`
      SELECT 1 FROM player_friendships friendship
       WHERE friendship.player_low_id = least(${actor.playerId}::uuid, ${targetPlayerId}::uuid)
         AND friendship.player_high_id = greatest(${actor.playerId}::uuid, ${targetPlayerId}::uuid)
         AND friendship.status = 'accepted'
         AND NOT EXISTS (
           SELECT 1 FROM player_blocks block
            WHERE (block.blocker_player_id = ${actor.playerId} AND block.blocked_player_id = ${targetPlayerId})
               OR (block.blocker_player_id = ${targetPlayerId} AND block.blocked_player_id = ${actor.playerId})
         )
       LIMIT 1
    `);
    if (!friendship.length) throw createError({ statusCode: 404, statusMessage: "Accepted friend not found" });
    const rows = await tx.execute<{ enabled: boolean }>(sql`
      INSERT INTO mobile_friend_online_alerts (owner_player_id, target_player_id, enabled, updated_at)
      VALUES (${actor.playerId}, ${targetPlayerId}, ${enabled}, now())
      ON CONFLICT (owner_player_id, target_player_id)
      DO UPDATE SET enabled = excluded.enabled, updated_at = now()
      RETURNING enabled
    `);
    return { playerId: targetPlayerId, enabled: rows[0]!.enabled };
  });
}
