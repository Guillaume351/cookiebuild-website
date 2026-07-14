CREATE TABLE IF NOT EXISTS "mobile_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "firebase_uid" varchar(128) NOT NULL,
  "deleted_firebase_uid_hash" varchar(64),
  "email" varchar(320),
  "display_name" varchar(80),
  "avatar_url" varchar(2048),
  "locale" varchar(16),
  "timezone" varchar(64),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz
);
--> statement-breakpoint
ALTER TABLE "mobile_users" ADD COLUMN IF NOT EXISTS "deleted_firebase_uid_hash" varchar(64);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mobile_users_firebase_uid_uq"
  ON "mobile_users" ("firebase_uid");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mobile_users_deleted_firebase_uid_hash_uq"
  ON "mobile_users" ("deleted_firebase_uid_hash");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "mobile_player_links" (
  "firebase_uid" text NOT NULL,
  "player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "edition" varchar(16) NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "linked_at" timestamptz DEFAULT now() NOT NULL,
  "revoked_at" timestamptz,
  PRIMARY KEY ("firebase_uid", "player_id", "edition"),
  CONSTRAINT "mobile_player_links_edition_ck" CHECK ("edition" IN ('java', 'bedrock'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mobile_player_links_firebase_uid_idx"
  ON "mobile_player_links" ("firebase_uid");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mobile_player_links_active_player_uq"
  ON "mobile_player_links" ("player_id", "edition") WHERE "revoked_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mobile_player_links_active_primary_uq"
  ON "mobile_player_links" ("firebase_uid") WHERE "is_primary" AND "revoked_at" IS NULL;
--> statement-breakpoint

-- The Minecraft plugin issues an 8-character code (excluding ambiguous glyphs), valid for
-- ten minutes, and stores
-- only its lowercase HMAC-SHA256 digest. Plaintext link codes never reach storage.
CREATE TABLE IF NOT EXISTS "player_link_challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "edition" varchar(16) NOT NULL,
  "code_hmac" varchar(64) NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "consumed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "player_link_challenges_edition_ck" CHECK ("edition" IN ('java', 'bedrock'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "player_link_challenges_code_hmac_uq"
  ON "player_link_challenges" ("code_hmac");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "player_link_challenges_active_player_uq"
  ON "player_link_challenges" ("player_id") WHERE "consumed_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_link_challenges_expiry_idx"
  ON "player_link_challenges" ("expires_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "mobile_devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "mobile_user_id" uuid NOT NULL REFERENCES "mobile_users"("id") ON DELETE CASCADE,
  "installation_id" varchar(128) NOT NULL,
  "platform" varchar(16) NOT NULL,
  "fcm_token" varchar(4096) NOT NULL,
  "app_version" varchar(32),
  "locale" varchar(16),
  "timezone" varchar(64),
  "notifications_authorized" boolean DEFAULT false NOT NULL,
  "last_seen_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "revoked_at" timestamptz,
  CONSTRAINT "mobile_devices_platform_ck" CHECK ("platform" IN ('ios', 'android'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mobile_devices_installation_id_uq"
  ON "mobile_devices" ("installation_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mobile_devices_fcm_token_uq"
  ON "mobile_devices" ("fcm_token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mobile_devices_user_idx"
  ON "mobile_devices" ("mobile_user_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "mobile_notification_preferences" (
  "mobile_user_id" uuid PRIMARY KEY NOT NULL REFERENCES "mobile_users"("id") ON DELETE CASCADE,
  "announcements_enabled" boolean DEFAULT true NOT NULL,
  "events_enabled" boolean DEFAULT true NOT NULL,
  "server_status_enabled" boolean DEFAULT true NOT NULL,
  "social_enabled" boolean DEFAULT true NOT NULL,
  "weekly_digest_enabled" boolean DEFAULT true NOT NULL,
  "quiet_hours_start" varchar(5),
  "quiet_hours_end" varchar(5),
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "mobile_notification_preferences_quiet_hours_ck" CHECK (
    ("quiet_hours_start" IS NULL AND "quiet_hours_end" IS NULL)
    OR
    ("quiet_hours_start" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      AND "quiet_hours_end" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
  )
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "mobile_notification_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kind" varchar(64) NOT NULL,
  "audience" jsonb NOT NULL,
  "payload" jsonb NOT NULL,
  "status" varchar(16) DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "available_at" timestamptz DEFAULT now() NOT NULL,
  "locked_at" timestamptz,
  "lock_token" uuid,
  "delivered_at" timestamptz,
  "last_error" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "mobile_notification_outbox_status_ck"
    CHECK ("status" IN ('pending', 'processing', 'delivered', 'dead'))
);
--> statement-breakpoint
ALTER TABLE "mobile_notification_outbox" ADD COLUMN IF NOT EXISTS "lock_token" uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mobile_notification_outbox_pending_idx"
  ON "mobile_notification_outbox" ("status", "available_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "mobile_news_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(120) NOT NULL,
  "title" varchar(160) NOT NULL,
  "summary" varchar(500) NOT NULL,
  "body" text NOT NULL,
  "cover_image_url" varchar(2048),
  "status" varchar(16) DEFAULT 'draft' NOT NULL,
  "published_at" timestamptz,
  "expires_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "mobile_news_posts_status_ck"
    CHECK ("status" IN ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mobile_news_posts_slug_uq" ON "mobile_news_posts" ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mobile_news_posts_published_idx"
  ON "mobile_news_posts" ("status", "published_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "mobile_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(120) NOT NULL,
  "title" varchar(160) NOT NULL,
  "description" text NOT NULL,
  "game_type" varchar(64),
  "image_url" varchar(2048),
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz,
  "status" varchar(16) DEFAULT 'scheduled' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "mobile_events_status_ck"
    CHECK ("status" IN ('draft', 'scheduled', 'cancelled', 'completed')),
  CONSTRAINT "mobile_events_time_ck" CHECK ("ends_at" IS NULL OR "ends_at" >= "starts_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mobile_events_slug_uq" ON "mobile_events" ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mobile_events_schedule_idx"
  ON "mobile_events" ("status", "starts_at");
--> statement-breakpoint

INSERT INTO "mobile_news_posts" (
  "slug",
  "title",
  "summary",
  "body",
  "status",
  "published_at"
) VALUES (
  'cookie-build-returns-2026',
  'Cookie Build is back',
  'The classic network is live again with rebuilt games and Java plus Bedrock support.',
  'Cookie Build is active again. Join from Java or Bedrock, rediscover MicroBattles and Pitchout, and help us test the rebuilt SkyWars and BuildBattles experiences as their maps return.',
  'published',
  '2026-07-14T10:00:00Z'
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "status" = EXCLUDED."status",
  "published_at" = EXCLUDED."published_at",
  "updated_at" = now();
--> statement-breakpoint

INSERT INTO "mobile_events" (
  "slug",
  "title",
  "description",
  "game_type",
  "starts_at",
  "ends_at",
  "status"
) VALUES (
  'comeback-night-2026-08-01',
  'Cookie Build comeback night',
  'A community night with rotating classic minigames, bonus progression, and the team online to collect feedback.',
  'all',
  '2026-08-01T18:00:00Z',
  '2026-08-01T21:00:00Z',
  'scheduled'
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "game_type" = EXCLUDED."game_type",
  "starts_at" = EXCLUDED."starts_at",
  "ends_at" = EXCLUDED."ends_at",
  "status" = EXCLUDED."status",
  "updated_at" = now();
