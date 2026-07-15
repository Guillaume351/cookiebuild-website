-- Cookie Build admin control center. All changes are additive and safe to apply
-- before the admin UI or the Minecraft AdminBridge is deployed.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'mobile_news_posts'
       AND column_name = 'content_type'
  ) THEN
    ALTER TABLE "mobile_news_posts"
      ADD COLUMN "content_type" varchar(16) DEFAULT 'news' NOT NULL;
    -- Before the admin existed, this table exclusively powered /changelog.
    UPDATE "mobile_news_posts" SET "content_type" = 'changelog';
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE "mobile_news_posts"
    ADD CONSTRAINT "mobile_news_posts_content_type_ck"
      CHECK ("content_type" IN ('news', 'changelog'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "admin_users" (
  "firebase_uid" varchar(128) PRIMARY KEY,
  "email" varchar(320) NOT NULL,
  "display_name" varchar(80),
  "role" varchar(16) NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "last_login_at" timestamptz,
  CONSTRAINT "admin_users_role_ck"
    CHECK ("role" IN ('viewer', 'moderator', 'editor', 'operator', 'owner'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_email_uq"
  ON "admin_users" (lower("email"));
CREATE INDEX IF NOT EXISTS "admin_users_enabled_role_idx"
  ON "admin_users" ("enabled", "role");

CREATE TABLE IF NOT EXISTS "admin_audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_uid" varchar(128) NOT NULL REFERENCES "admin_users"("firebase_uid"),
  "actor_role" varchar(16) NOT NULL,
  "action" varchar(96) NOT NULL,
  "resource_type" varchar(64) NOT NULL,
  "resource_id" varchar(255),
  "request_id" varchar(64),
  "ip_address" varchar(64),
  "user_agent" varchar(512),
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "admin_audit_log_created_idx"
  ON "admin_audit_log" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "admin_audit_log_actor_created_idx"
  ON "admin_audit_log" ("actor_uid", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "admin_audit_log_resource_created_idx"
  ON "admin_audit_log" ("resource_type", "resource_id", "created_at" DESC);

CREATE OR REPLACE FUNCTION cookiebuild_reject_admin_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_log is append-only';
END;
$$;

DROP TRIGGER IF EXISTS "admin_audit_log_append_only" ON "admin_audit_log";
CREATE TRIGGER "admin_audit_log_append_only"
  BEFORE UPDATE OR DELETE ON "admin_audit_log"
  FOR EACH ROW EXECUTE FUNCTION cookiebuild_reject_admin_audit_mutation();

CREATE TABLE IF NOT EXISTS "admin_report_cases" (
  "report_id" uuid PRIMARY KEY REFERENCES "player_reports"("id") ON DELETE CASCADE,
  "status" varchar(16) DEFAULT 'open' NOT NULL,
  "assigned_to" varchar(128) REFERENCES "admin_users"("firebase_uid"),
  "resolution_note" text,
  "updated_by" varchar(128) NOT NULL REFERENCES "admin_users"("firebase_uid"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "resolved_at" timestamptz,
  CONSTRAINT "admin_report_cases_status_ck"
    CHECK ("status" IN ('open', 'reviewing', 'resolved', 'dismissed')),
  CONSTRAINT "admin_report_cases_resolution_ck" CHECK (
    ("status" IN ('open', 'reviewing') AND "resolved_at" IS NULL)
    OR ("status" IN ('resolved', 'dismissed') AND "resolved_at" IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS "admin_report_cases_status_updated_idx"
  ON "admin_report_cases" ("status", "updated_at" DESC);

CREATE TABLE IF NOT EXISTS "admin_notification_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_by" varchar(128) NOT NULL REFERENCES "admin_users"("firebase_uid"),
  "kind" varchar(32) NOT NULL,
  "title" varchar(120) NOT NULL,
  "body" varchar(500),
  "image_url" varchar(2048),
  "deep_link" varchar(2048),
  "audience" jsonb NOT NULL,
  "recipient_estimate" integer DEFAULT 0 NOT NULL,
  "status" varchar(16) DEFAULT 'queued' NOT NULL,
  "scheduled_at" timestamptz NOT NULL,
  "outbox_id" uuid UNIQUE REFERENCES "mobile_notification_outbox"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "cancelled_at" timestamptz,
  "cancelled_by" varchar(128) REFERENCES "admin_users"("firebase_uid"),
  CONSTRAINT "admin_notification_campaigns_kind_ck"
    CHECK ("kind" IN ('announcement', 'event', 'server_status', 'social')),
  CONSTRAINT "admin_notification_campaigns_status_ck"
    CHECK ("status" IN ('queued', 'scheduled', 'cancelled')),
  CONSTRAINT "admin_notification_campaigns_recipient_estimate_ck"
    CHECK ("recipient_estimate" >= 0)
);

CREATE INDEX IF NOT EXISTS "admin_notification_campaigns_created_idx"
  ON "admin_notification_campaigns" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "admin_notification_campaigns_schedule_idx"
  ON "admin_notification_campaigns" ("status", "scheduled_at");

-- Durable command contract shared with CookieDough's AdminBridge.
CREATE TABLE IF NOT EXISTS "admin_commands" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" varchar(64) NOT NULL,
  "target_type" varchar(32) NOT NULL,
  "target_id" varchar(255),
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" varchar(16) DEFAULT 'pending' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "available_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "result" jsonb,
  "error" text,
  "idempotency_key" varchar(255) NOT NULL UNIQUE,
  CONSTRAINT "admin_commands_status_ck"
    CHECK ("status" IN ('pending', 'running', 'succeeded', 'failed', 'expired', 'cancelled')),
  CONSTRAINT "admin_commands_expiry_ck" CHECK ("expires_at" > "created_at")
);

CREATE INDEX IF NOT EXISTS "admin_commands_pending_idx"
  ON "admin_commands" ("status", "available_at", "created_at")
  WHERE "status" = 'pending';
CREATE INDEX IF NOT EXISTS "admin_commands_target_idx"
  ON "admin_commands" ("target_type", "target_id", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "moderation_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "player_name" varchar(255) NOT NULL,
  "action_type" varchar(16) NOT NULL,
  "reason" varchar(500) NOT NULL,
  "actor_id" varchar(128) NOT NULL REFERENCES "admin_users"("firebase_uid"),
  "actor_display_name" varchar(80) NOT NULL,
  "starts_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz,
  "revoked_at" timestamptz,
  "revoked_by" varchar(128) REFERENCES "admin_users"("firebase_uid"),
  "source_command_id" uuid UNIQUE REFERENCES "admin_commands"("id") ON DELETE SET NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "moderation_actions_type_ck" CHECK ("action_type" IN ('ban', 'mute')),
  CONSTRAINT "moderation_actions_expiry_ck" CHECK ("expires_at" IS NULL OR "expires_at" > "starts_at")
);

CREATE INDEX IF NOT EXISTS "moderation_actions_player_created_idx"
  ON "moderation_actions" ("player_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "moderation_actions_active_idx"
  ON "moderation_actions" ("action_type", "expires_at")
  WHERE "revoked_at" IS NULL;

-- Latest-state and event fallback for the website when the live Rabbit stream is
-- temporarily unavailable. Producers replace a snapshot and append events.
CREATE TABLE IF NOT EXISTS "admin_runtime_snapshots" (
  "server_id" varchar(64) PRIMARY KEY,
  "sequence" bigint DEFAULT 0 NOT NULL,
  "payload" jsonb NOT NULL,
  "observed_at" timestamptz NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "admin_runtime_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL UNIQUE,
  "server_id" varchar(64) NOT NULL,
  "kind" varchar(64) NOT NULL,
  "payload" jsonb NOT NULL,
  "observed_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "admin_runtime_events_created_idx"
  ON "admin_runtime_events" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "admin_runtime_events_server_observed_idx"
  ON "admin_runtime_events" ("server_id", "observed_at" DESC);

CREATE TABLE IF NOT EXISTS "ops_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "action" varchar(64) NOT NULL,
  "requested_by" varchar(128) NOT NULL REFERENCES "admin_users"("firebase_uid"),
  "reason" varchar(500) NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" varchar(16) DEFAULT 'pending' NOT NULL,
  "requested_at" timestamptz DEFAULT now() NOT NULL,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "result" jsonb,
  "error" text,
  CONSTRAINT "ops_actions_status_ck"
    CHECK ("status" IN ('pending', 'running', 'succeeded', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS "ops_actions_requested_idx"
  ON "ops_actions" ("requested_at" DESC);
CREATE INDEX IF NOT EXISTS "ops_actions_pending_idx"
  ON "ops_actions" ("status", "requested_at") WHERE "status" = 'pending';

CREATE TABLE IF NOT EXISTS "update_check_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "status" varchar(16) NOT NULL,
  "summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "report_markdown" text,
  "prompt_markdown" text,
  "checked_at" timestamptz DEFAULT now() NOT NULL,
  "error" text,
  CONSTRAINT "update_check_runs_status_ck"
    CHECK ("status" IN ('running', 'current', 'updates_available', 'failed'))
);

CREATE INDEX IF NOT EXISTS "update_check_runs_checked_idx"
  ON "update_check_runs" ("checked_at" DESC);
