-- Build Battle gallery (release bb-gallery-20261003). The BuildBattles plugin
-- captures each builder's plot at the end of a match and writes it here; the
-- website and the app read it. Safe to re-run.
CREATE TABLE IF NOT EXISTS "buildbattle_builds" (
  "id" uuid PRIMARY KEY,
  "short_code" varchar(10) NOT NULL UNIQUE,
  "player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "match_id" uuid,
  "theme_key" varchar(64) NOT NULL,
  "theme_name" varchar(80) NOT NULL,
  "outcome" varchar(24) NOT NULL,
  "placement" smallint,
  "builders" smallint NOT NULL,
  "block_count" integer NOT NULL,
  "size_x" smallint NOT NULL,
  "size_y" smallint NOT NULL,
  "size_z" smallint NOT NULL,
  "data" bytea NOT NULL,
  "like_count" integer NOT NULL DEFAULT 0,
  "report_count" integer NOT NULL DEFAULT 0,
  "status" varchar(16) NOT NULL DEFAULT 'published',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "buildbattle_builds_status_created_idx"
  ON "buildbattle_builds" ("status", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "buildbattle_builds_status_likes_idx"
  ON "buildbattle_builds" ("status", "like_count" DESC, "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "buildbattle_builds_player_created_idx"
  ON "buildbattle_builds" ("player_id", "created_at" DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "buildbattle_build_likes" (
  "build_id" uuid NOT NULL REFERENCES "buildbattle_builds"("id") ON DELETE CASCADE,
  "liker_key" varchar(80) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("build_id", "liker_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "buildbattle_build_reports" (
  "build_id" uuid NOT NULL REFERENCES "buildbattle_builds"("id") ON DELETE CASCADE,
  "reporter_key" varchar(80) NOT NULL,
  "reason" varchar(32) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("build_id", "reporter_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "buildbattle_gallery_settings" (
  "player_id" uuid PRIMARY KEY REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "gallery_opt_out" boolean NOT NULL DEFAULT false,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
-- Contract section 5: total likes the player has already been told about on join.
ALTER TABLE "buildbattle_gallery_settings"
  ADD COLUMN IF NOT EXISTS "last_seen_like_total" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
-- Website-only: one marker per Discord community announcement (e.g. a Soirée
-- Cookie reminder) so several replicas never post the same message twice.
CREATE TABLE IF NOT EXISTS "discord_event_announcements" (
  "dedupe_key" varchar(120) PRIMARY KEY,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
