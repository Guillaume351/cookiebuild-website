-- App companion rewards, the app-exclusive daily chest, aggregated engagement
-- counters, localized community events and safer notification defaults.
-- Safe to re-run. Run in one transaction (Drizzle supplies it; psql callers use -1).

-- Contract shared with CookieDough: the website only inserts grants, the game
-- server polls undelivered rows, credits them and sets delivered_at.
CREATE TABLE IF NOT EXISTS "player_reward_grants" (
  "id" bigserial PRIMARY KEY,
  "player_uuid" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "source" text NOT NULL,
  "period_key" text NOT NULL,
  "coins" integer DEFAULT 0 NOT NULL,
  "xp" integer DEFAULT 0 NOT NULL,
  "cosmetic_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "delivered_at" timestamptz,
  CONSTRAINT "player_reward_grants_player_source_period_uq"
    UNIQUE ("player_uuid", "source", "period_key"),
  CONSTRAINT "player_reward_grants_amounts_ck" CHECK ("coins" >= 0 AND "xp" >= 0),
  CONSTRAINT "player_reward_grants_keys_ck" CHECK (
    length("source") BETWEEN 1 AND 64 AND length("period_key") BETWEEN 1 AND 64
  )
);

CREATE INDEX IF NOT EXISTS "player_reward_grants_undelivered_idx"
  ON "player_reward_grants" ("delivered_at") WHERE "delivered_at" IS NULL;

CREATE INDEX IF NOT EXISTS "player_reward_grants_pending_player_idx"
  ON "player_reward_grants" ("player_uuid", "created_at") WHERE "delivered_at" IS NULL;

-- One app chest per Minecraft player and Europe/Paris calendar day. The stored
-- streak makes the next day's reward an O(1) lookup of yesterday's row.
CREATE TABLE IF NOT EXISTS "mobile_daily_claims" (
  "player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "claim_date" date NOT NULL,
  "streak" integer NOT NULL,
  "cycle_day" smallint NOT NULL,
  "coins" integer NOT NULL,
  "grant_id" bigint REFERENCES "player_reward_grants"("id") ON DELETE SET NULL,
  "claimed_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("player_id", "claim_date"),
  CONSTRAINT "mobile_daily_claims_values_ck" CHECK (
    "streak" >= 1 AND "cycle_day" BETWEEN 1 AND 7 AND "coins" >= 0
  )
);

-- Aggregated, identity-free daily counters (Europe/Paris days).
CREATE TABLE IF NOT EXISTS "mobile_engagement_daily" (
  "day" date NOT NULL,
  "metric" varchar(32) NOT NULL,
  "kind" varchar(64) NOT NULL,
  "count" bigint DEFAULT 0 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("day", "metric", "kind"),
  CONSTRAINT "mobile_engagement_daily_metric_ck" CHECK (
    "metric" IN ('notification_opened', 'player_link_claimed', 'daily_chest_claimed')
  ),
  CONSTRAINT "mobile_engagement_daily_kind_ck" CHECK ("kind" ~ '^[a-z0-9_]{1,64}$'),
  CONSTRAINT "mobile_engagement_daily_count_ck" CHECK ("count" >= 0)
);

CREATE SCHEMA IF NOT EXISTS metrics;

CREATE OR REPLACE VIEW metrics.mobile_engagement_daily WITH (security_barrier = true) AS
SELECT ("day"::timestamp AT TIME ZONE 'Europe/Paris') AS time, metric, kind, "count"
FROM public.mobile_engagement_daily
WHERE "day" >= CURRENT_DATE - 180;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cookiebuild_metrics') THEN
    GRANT USAGE ON SCHEMA metrics TO cookiebuild_metrics;
    GRANT SELECT ON metrics.mobile_engagement_daily TO cookiebuild_metrics;
    REVOKE ALL ON public.mobile_engagement_daily FROM cookiebuild_metrics;
  END IF;
END $$;

-- Localized copies for generated community events. "title"/"description"
-- remain the English fallback that every existing client already reads.
ALTER TABLE "mobile_events"
  ADD COLUMN IF NOT EXISTS "localizations" jsonb DEFAULT '{}'::jsonb NOT NULL;

DO $$ BEGIN
  ALTER TABLE "mobile_events"
    ADD CONSTRAINT "mobile_events_localizations_ck" CHECK (jsonb_typeof("localizations") = 'object');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notification defaults. Preference rows are materialized with column defaults
-- in the same transaction that creates the mobile user, so an untouched row has
-- updated_at = mobile_users.created_at. Any other value means the app saved it.
ALTER TABLE "mobile_notification_preferences"
  ADD COLUMN IF NOT EXISTS "explicitly_saved_at" timestamptz;

UPDATE "mobile_notification_preferences" preference
   SET "explicitly_saved_at" = preference."updated_at"
  FROM "mobile_users" user_row
 WHERE user_row."id" = preference."mobile_user_id"
   AND preference."explicitly_saved_at" IS NULL
   AND preference."updated_at" <> user_row."created_at";

-- Only rows that were never saved move to the new defaults; updated_at is left
-- untouched so a re-run makes the same decision and explicit choices are kept.
UPDATE "mobile_notification_preferences"
   SET "rally_enabled" = true,
       "friend_online_enabled" = true,
       "daily_reminder_enabled" = true
 WHERE "explicitly_saved_at" IS NULL
   AND NOT ("rally_enabled" AND "friend_online_enabled" AND "daily_reminder_enabled");

ALTER TABLE "mobile_notification_preferences"
  ALTER COLUMN "rally_enabled" SET DEFAULT true,
  ALTER COLUMN "friend_online_enabled" SET DEFAULT true,
  ALTER COLUMN "daily_reminder_enabled" SET DEFAULT true;
