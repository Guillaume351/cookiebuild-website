CREATE TABLE IF NOT EXISTS "player_rallies" (
  "id" uuid PRIMARY KEY NOT NULL,
  "outbox_id" uuid NOT NULL,
  "server_id" varchar(64) NOT NULL,
  "target_player_id" uuid NOT NULL,
  "game_id" uuid,
  "source" varchar(16) NOT NULL,
  "gamemode" varchar(32) NOT NULL,
  "available_at" timestamptz NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "player_rallies_outbox_id_uq" UNIQUE("outbox_id"),
  CONSTRAINT "player_rallies_server_id_ck"
    CHECK ("server_id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  CONSTRAINT "player_rallies_source_ck"
    CHECK ("source" IN ('login', 'player', 'automatic')),
  CONSTRAINT "player_rallies_context_ck" CHECK (
    ("source" = 'login' AND "gamemode" = 'network' AND "game_id" IS NULL)
    OR ("source" IN ('player', 'automatic') AND "gamemode" <> 'network' AND "game_id" IS NOT NULL)
  ),
  CONSTRAINT "player_rallies_expiry_ck" CHECK ("expires_at" > "available_at")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_rallies" ADD CONSTRAINT "player_rallies_outbox_id_mobile_notification_outbox_id_fk"
 FOREIGN KEY ("outbox_id") REFERENCES "public"."mobile_notification_outbox"("id")
 ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_rallies" ADD CONSTRAINT "player_rallies_target_player_id_playerdata_id_fk"
 FOREIGN KEY ("target_player_id") REFERENCES "public"."playerdata"("id")
 ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_rallies_target_expiry_idx"
  ON "player_rallies" ("target_player_id", "expires_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "player_rally_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rally_id" uuid NOT NULL,
  "responder_player_id" uuid NOT NULL,
  "response" varchar(16) NOT NULL,
  "responded_at" timestamptz DEFAULT now() NOT NULL,
  "delivered_at" timestamptz,
  CONSTRAINT "player_rally_responses_rally_responder_uq"
    UNIQUE("rally_id", "responder_player_id"),
  CONSTRAINT "player_rally_responses_response_ck"
    CHECK ("response" IN ('joining', 'unavailable'))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_rally_responses" ADD CONSTRAINT "player_rally_responses_rally_id_player_rallies_id_fk"
 FOREIGN KEY ("rally_id") REFERENCES "public"."player_rallies"("id")
 ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_rally_responses" ADD CONSTRAINT "player_rally_responses_responder_player_id_playerdata_id_fk"
 FOREIGN KEY ("responder_player_id") REFERENCES "public"."playerdata"("id")
 ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_rally_responses_delivery_idx"
  ON "player_rally_responses" ("responded_at")
  WHERE "delivered_at" IS NULL;
