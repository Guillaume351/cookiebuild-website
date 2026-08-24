ALTER TABLE "mobile_notification_preferences"
  ADD COLUMN IF NOT EXISTS "skyblock_market_sold_enabled" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "skyblock_worker_full_enabled" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "skyblock_objective_ready_enabled" boolean DEFAULT false NOT NULL;
