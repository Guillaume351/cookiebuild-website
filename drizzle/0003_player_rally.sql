ALTER TABLE "mobile_notification_preferences"
  ADD COLUMN IF NOT EXISTS "rally_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "mobile_notification_outbox_player_rally_id_uq"
  ON "mobile_notification_outbox" (("payload" ->> 'rallyId'))
  WHERE "kind" = 'player_rally';
