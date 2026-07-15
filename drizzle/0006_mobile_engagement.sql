-- Mobile 2.1 engagement is opt-in. This migration is intentionally safe to re-run.
ALTER TABLE "mobile_notification_preferences"
  ADD COLUMN IF NOT EXISTS "daily_reminder_enabled" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "weekly_reminder_enabled" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "friend_online_enabled" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "quiet_hours_enabled" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "timezone_offset_minutes" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "online_visibility" varchar(24) DEFAULT 'friends_and_party' NOT NULL;

DO $$ BEGIN
  ALTER TABLE "mobile_notification_preferences"
    ADD CONSTRAINT "mobile_notification_preferences_timezone_offset_ck"
      CHECK ("timezone_offset_minutes" BETWEEN -840 AND 840);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "mobile_notification_preferences"
    ADD CONSTRAINT "mobile_notification_preferences_online_visibility_ck"
      CHECK ("online_visibility" IN ('friends_and_party', 'friends', 'hidden'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "mobile_notification_outbox"
  ADD COLUMN IF NOT EXISTS "dedupe_key" varchar(255);

CREATE UNIQUE INDEX IF NOT EXISTS "mobile_notification_outbox_dedupe_key_uq"
  ON "mobile_notification_outbox" ("dedupe_key")
  WHERE "dedupe_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "mobile_notification_outbox_friend_online_cooldown_idx"
  ON "mobile_notification_outbox" (
    ("audience" ->> 'firebaseUid'),
    (("payload" -> 'data') ->> 'playerId'),
    "created_at"
  ) WHERE "kind" = 'friend_online';

CREATE INDEX IF NOT EXISTS "player_sessions_online_start_idx"
  ON "player_sessions" ("start_time", "player_id") WHERE "end_time" IS NULL;

CREATE TABLE IF NOT EXISTS "player_goal_progress" (
  "player_id" uuid PRIMARY KEY REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "day" date DEFAULT (timezone('UTC', now()))::date NOT NULL,
  "daily_matches" integer DEFAULT 0 NOT NULL,
  "daily_wins" integer DEFAULT 0 NOT NULL,
  "first_win_date" date,
  "week" varchar(8) NOT NULL,
  "weekly_matches" integer DEFAULT 0 NOT NULL,
  "weekly_wins" integer DEFAULT 0 NOT NULL,
  "weekly_kills" integer DEFAULT 0 NOT NULL,
  "achievements" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "player_goal_progress_nonnegative_ck" CHECK (
    "daily_matches" >= 0 AND "daily_wins" >= 0 AND
    "weekly_matches" >= 0 AND "weekly_wins" >= 0 AND "weekly_kills" >= 0
  ),
  CONSTRAINT "player_goal_progress_achievements_ck" CHECK (jsonb_typeof("achievements") = 'array')
);

ALTER TABLE "player_goal_progress"
  ADD COLUMN IF NOT EXISTS "first_win_date" date;

CREATE INDEX IF NOT EXISTS "player_goal_progress_week_idx"
  ON "player_goal_progress" ("week", "updated_at");

CREATE TABLE IF NOT EXISTS "player_app_promotion_state" (
  "player_id" uuid PRIMARY KEY REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "last_shown_at" timestamptz NOT NULL,
  "show_count" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "player_app_promotion_state_count_ck" CHECK ("show_count" BETWEEN 1 AND 3)
);

CREATE TABLE IF NOT EXISTS "mobile_friend_online_alerts" (
  "owner_player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "target_player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "enabled" boolean DEFAULT false NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("owner_player_id", "target_player_id"),
  CONSTRAINT "mobile_friend_online_alerts_self_ck" CHECK ("owner_player_id" <> "target_player_id")
);

CREATE INDEX IF NOT EXISTS "mobile_friend_online_alerts_target_idx"
  ON "mobile_friend_online_alerts" ("target_player_id") WHERE "enabled";

DELETE FROM "mobile_friend_online_alerts" alert
 WHERE NOT EXISTS (
   SELECT 1 FROM "player_friendships" friendship
    WHERE friendship.status = 'accepted'
      AND friendship.player_low_id = least(alert.owner_player_id, alert.target_player_id)
      AND friendship.player_high_id = greatest(alert.owner_player_id, alert.target_player_id)
 );
