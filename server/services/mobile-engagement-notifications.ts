import { sql } from "drizzle-orm";
import db from "../../db/client";
import { mobileCapabilities } from "./mobile-capabilities";
import {
  skyblockActionNotificationsEnabled,
  skyblockNotificationTextSql,
} from "./mobile-skyblock-notification-copy";

/**
 * Produces only explicitly opted-in reminders. Unique dedupe keys make every
 * sweep safe across replicas and friend alerts additionally have a six-hour
 * per-pair cooldown.
 */
export async function enqueueMobileEngagementNotifications() {
  const daily = await db.execute(sql`
    INSERT INTO mobile_notification_outbox (kind, dedupe_key, audience, payload)
    SELECT 'daily_goal_reminder',
           'daily-goal:' || user_row.id || ':' || timezone('UTC', now())::date,
           jsonb_build_object('firebaseUid', user_row.firebase_uid),
           jsonb_build_object(
             'title', CASE WHEN lower(COALESCE(user_row.locale, '')) LIKE 'fr%'
               THEN 'Ton objectif Cookie Build du jour t’attend'
               ELSE 'Your daily Cookie Build goal is waiting' END,
             'body', CASE WHEN lower(COALESCE(user_row.locale, '')) LIKE 'fr%'
               THEN 'Joue une partie aujourd’hui pour entretenir ta progression.'
               ELSE 'Play one match today to keep your momentum going.' END,
             'deepLink', 'cookiebuild://progress',
             'data', jsonb_build_object('type', 'daily_goal_reminder', 'resetTimezone', 'UTC')
           )
      FROM mobile_users user_row
      JOIN mobile_notification_preferences preference ON preference.mobile_user_id = user_row.id
      JOIN mobile_player_links link
        ON link.firebase_uid = user_row.firebase_uid AND link.is_primary AND link.revoked_at IS NULL
      LEFT JOIN player_goal_progress goal ON goal.player_id = link.player_id
     WHERE user_row.deleted_at IS NULL
       AND preference.daily_reminder_enabled
       AND (now() + make_interval(mins => preference.timezone_offset_minutes))::time >= time '19:00'
       AND (now() + make_interval(mins => preference.timezone_offset_minutes))::time < time '19:15'
       AND (goal.day IS DISTINCT FROM timezone('UTC', now())::date OR goal.daily_matches < 1)
       AND EXISTS (
         SELECT 1 FROM mobile_devices device
          WHERE device.mobile_user_id = user_row.id
            AND device.notifications_authorized AND device.revoked_at IS NULL
       )
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
    RETURNING id
  `);

  const weekly = await db.execute(sql`
    INSERT INTO mobile_notification_outbox (kind, dedupe_key, audience, payload)
    SELECT 'weekly_goal_reminder',
           'weekly-goal:' || user_row.id || ':' || to_char(timezone('UTC', now()), 'IYYY-"W"IW'),
           jsonb_build_object('firebaseUid', user_row.firebase_uid),
           jsonb_build_object(
             'title', CASE WHEN lower(COALESCE(user_row.locale, '')) LIKE 'fr%'
               THEN 'Nouveaux objectifs Cookie Build de la semaine'
               ELSE 'New weekly Cookie Build goals' END,
             'body', CASE WHEN lower(COALESCE(user_row.locale, '')) LIKE 'fr%'
               THEN 'Joue trois parties, gagne une fois et réalise dix éliminations cette semaine.'
               ELSE 'Play three matches, win once, and earn ten eliminations this week.' END,
             'deepLink', 'cookiebuild://progress',
             'data', jsonb_build_object('type', 'weekly_goal_reminder', 'resetTimezone', 'UTC')
           )
      FROM mobile_users user_row
      JOIN mobile_notification_preferences preference ON preference.mobile_user_id = user_row.id
      JOIN mobile_player_links link
        ON link.firebase_uid = user_row.firebase_uid AND link.is_primary AND link.revoked_at IS NULL
      LEFT JOIN player_goal_progress goal ON goal.player_id = link.player_id
     WHERE user_row.deleted_at IS NULL
       AND preference.weekly_reminder_enabled
       AND extract(isodow FROM (now() + make_interval(mins => preference.timezone_offset_minutes))) = 1
       AND (now() + make_interval(mins => preference.timezone_offset_minutes))::time >= time '18:00'
       AND (now() + make_interval(mins => preference.timezone_offset_minutes))::time < time '18:15'
       AND (goal.week IS DISTINCT FROM to_char(timezone('UTC', now()), 'IYYY-"W"IW')
            OR goal.weekly_matches < 3 OR goal.weekly_wins < 1 OR goal.weekly_kills < 10)
       AND EXISTS (
         SELECT 1 FROM mobile_devices device
          WHERE device.mobile_user_id = user_row.id
            AND device.notifications_authorized AND device.revoked_at IS NULL
       )
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
    RETURNING id
  `);

  const friends = await db.execute(sql`
    INSERT INTO mobile_notification_outbox (kind, dedupe_key, audience, payload)
    SELECT 'friend_online',
           'friend-online:' || owner_user.id || ':' || session.id,
           jsonb_build_object('firebaseUid', owner_user.firebase_uid),
           jsonb_build_object(
             'title', CASE WHEN lower(COALESCE(owner_user.locale, '')) LIKE 'fr%'
               THEN COALESCE(target.name, 'Un ami') || ' est en ligne'
               ELSE COALESCE(target.name, 'A friend') || ' is online' END,
             'body', CASE WHEN lower(COALESCE(owner_user.locale, '')) LIKE 'fr%'
               THEN 'Un ami accepté que tu as sélectionné vient de rejoindre Cookie Build.'
               ELSE 'An accepted friend you selected just joined Cookie Build.' END,
             'deepLink', 'cookiebuild://friends',
             'data', jsonb_build_object(
               'type', 'friend_online',
               'playerId', target.id,
               'playerName', COALESCE(target.name, 'Unknown player')
             )
           )
      FROM player_sessions session
      JOIN playerdata target ON target.id = session.player_id
      JOIN mobile_friend_online_alerts alert
        ON alert.target_player_id = target.id AND alert.enabled
      JOIN player_friendships friendship
        ON friendship.player_low_id = least(alert.owner_player_id, target.id)
       AND friendship.player_high_id = greatest(alert.owner_player_id, target.id)
       AND friendship.status = 'accepted'
      JOIN mobile_player_links owner_link
        ON owner_link.player_id = alert.owner_player_id
       AND owner_link.is_primary AND owner_link.revoked_at IS NULL
      JOIN mobile_users owner_user
        ON owner_user.firebase_uid = owner_link.firebase_uid AND owner_user.deleted_at IS NULL
      JOIN mobile_notification_preferences owner_pref
        ON owner_pref.mobile_user_id = owner_user.id AND owner_pref.friend_online_enabled
     WHERE session.end_time IS NULL
       AND session.start_time >= now() - interval '5 minutes'
       AND NOT EXISTS (
         SELECT 1
           FROM mobile_player_links privacy_link
           JOIN mobile_users privacy_user
             ON privacy_user.firebase_uid = privacy_link.firebase_uid AND privacy_user.deleted_at IS NULL
           JOIN mobile_notification_preferences privacy_pref
             ON privacy_pref.mobile_user_id = privacy_user.id
          WHERE privacy_link.player_id = target.id
            AND privacy_link.is_primary AND privacy_link.revoked_at IS NULL
            AND privacy_pref.online_visibility = 'hidden'
       )
       AND NOT EXISTS (
         SELECT 1 FROM player_blocks block
          WHERE (block.blocker_player_id = alert.owner_player_id AND block.blocked_player_id = target.id)
             OR (block.blocker_player_id = target.id AND block.blocked_player_id = alert.owner_player_id)
       )
       AND NOT EXISTS (
         SELECT 1 FROM mobile_notification_outbox recent
          WHERE recent.kind = 'friend_online'
            AND recent.created_at >= now() - interval '6 hours'
            AND recent.audience ->> 'firebaseUid' = owner_user.firebase_uid
            AND recent.payload -> 'data' ->> 'playerId' = target.id::text
       )
       AND EXISTS (
         SELECT 1 FROM mobile_devices device
          WHERE device.mobile_user_id = owner_user.id
            AND device.notifications_authorized AND device.revoked_at IS NULL
       )
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
    RETURNING id
  `);
  let workerFull = 0;
  let objectiveReady = 0;
  const capabilities = await mobileCapabilities();
  if (skyblockActionNotificationsEnabled(capabilities)) {
    const workerTitle = skyblockNotificationTextSql(sql`locale`, "workerTitle");
    const workerBody = skyblockNotificationTextSql(sql`locale`, "workerBody");
    const workers = await db.execute(sql`
      WITH candidates AS (
        SELECT user_row.id AS mobile_user_id, user_row.firebase_uid, user_row.locale,
               worker.id AS worker_id, worker.worker_type,
               worker.production_cursor_at
          FROM skyblock_workers worker
          JOIN skyblock_island_members membership ON membership.island_id = worker.island_id
          JOIN mobile_player_links link
            ON link.player_id = membership.player_id AND link.is_primary AND link.revoked_at IS NULL
          JOIN mobile_users user_row
            ON user_row.firebase_uid = link.firebase_uid AND user_row.deleted_at IS NULL
          JOIN mobile_notification_preferences preference
            ON preference.mobile_user_id = user_row.id AND preference.skyblock_worker_full_enabled
         WHERE worker.status = 'active'
           AND worker.buffer_quantity + floor(
             least(43200, greatest(0, extract(epoch FROM (now() - worker.production_cursor_at)))) /
             greatest(15, 75 - (worker.tier - 1) * 12)
           ) >= worker.buffer_capacity
           AND EXISTS (
             SELECT 1 FROM mobile_devices device
              WHERE device.mobile_user_id = user_row.id
                AND device.notifications_authorized AND device.revoked_at IS NULL
           )
           AND NOT EXISTS (
             SELECT 1 FROM mobile_notification_outbox existing
              WHERE existing.dedupe_key =
                'skyblock-worker-full:' || user_row.id || ':' || worker.id || ':' ||
                extract(epoch FROM worker.production_cursor_at)::bigint
           )
         ORDER BY worker.updated_at, worker.id, user_row.id
         LIMIT 100
      )
      INSERT INTO mobile_notification_outbox (kind, dedupe_key, audience, payload)
      SELECT 'skyblock_worker_full',
             'skyblock-worker-full:' || mobile_user_id || ':' || worker_id || ':' ||
               extract(epoch FROM production_cursor_at)::bigint,
             jsonb_build_object('firebaseUid', firebase_uid),
             jsonb_build_object(
               'title', ${workerTitle},
               'body', ${workerBody},
               'deepLink', 'cookiebuild://skyblock/management/workers',
               'data', jsonb_build_object('type', 'skyblock_worker_full', 'workerId', worker_id, 'workerType', worker_type)
             )
        FROM candidates
      ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
      RETURNING id
    `);
    workerFull = workers.length;

    const objectiveTitle = skyblockNotificationTextSql(
      sql`locale`,
      "objectiveTitle",
    );
    const objectiveBody = skyblockNotificationTextSql(
      sql`locale`,
      "objectiveBody",
    );
    const objectives = await db.execute(sql`
      WITH candidates AS (
        SELECT user_row.id AS mobile_user_id, user_row.firebase_uid, user_row.locale,
               objective.cadence, objective.period_start, objective.objective_id
          FROM skyblock_periodic_objectives objective
          JOIN mobile_player_links link
            ON link.player_id = objective.player_id AND link.is_primary AND link.revoked_at IS NULL
          JOIN mobile_users user_row
            ON user_row.firebase_uid = link.firebase_uid AND user_row.deleted_at IS NULL
          JOIN mobile_notification_preferences preference
            ON preference.mobile_user_id = user_row.id AND preference.skyblock_objective_ready_enabled
         WHERE objective.completed_at IS NOT NULL AND objective.claimed_at IS NULL
           AND ((objective.cadence = 'daily' AND objective.period_start = timezone('UTC', now())::date)
             OR (objective.cadence = 'weekly' AND objective.period_start = date_trunc('week', timezone('UTC', now()))::date))
           AND EXISTS (
             SELECT 1 FROM mobile_devices device
              WHERE device.mobile_user_id = user_row.id
                AND device.notifications_authorized AND device.revoked_at IS NULL
           )
           AND NOT EXISTS (
             SELECT 1 FROM mobile_notification_outbox existing
              WHERE existing.dedupe_key =
                'skyblock-objective-ready:' || user_row.id || ':' || objective.cadence || ':' ||
                objective.period_start || ':' || objective.objective_id
           )
         ORDER BY objective.updated_at, objective.player_id
         LIMIT 100
      )
      INSERT INTO mobile_notification_outbox (kind, dedupe_key, audience, payload)
      SELECT 'skyblock_objective_ready',
             'skyblock-objective-ready:' || mobile_user_id || ':' || cadence || ':' || period_start || ':' || objective_id,
             jsonb_build_object('firebaseUid', firebase_uid),
             jsonb_build_object(
               'title', ${objectiveTitle},
               'body', ${objectiveBody},
               'deepLink', 'cookiebuild://skyblock/management/objectives',
               'data', jsonb_build_object('type', 'skyblock_objective_ready', 'cadence', cadence, 'objectiveId', objective_id)
             )
        FROM candidates
      ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
      RETURNING id
    `);
    objectiveReady = objectives.length;
  }
  return {
    daily: daily.length,
    weekly: weekly.length,
    friendOnline: friends.length,
    workerFull,
    objectiveReady,
  };
}
