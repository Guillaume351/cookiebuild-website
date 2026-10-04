-- Shop activation (release polish-20261004).
-- 1. Eight new cosmetics: seven bought in game with earned coins (never sold for
--    money) and one achievement reward. Constraints only widen, following 0021/0025.
-- 2. cosmetic_welcome_gifts: the free Cookie Sparkles trail is equipped once per
--    account on the first lobby arrival (only into an empty trail slot). The row
--    is the idempotency marker and the server-side gift counter.
-- 3. cosmetic_first_activations.observed_source tells how a first activation
--    happened: the game server sets the transaction-local setting
--    cookiebuild.cosmetic_source to gift / purchase / grant before writing a
--    selection; anything else (players, website) stays 'selection'.
-- Safe to re-run. Run in one transaction (Drizzle supplies it; psql callers use -1).
ALTER TABLE "cosmetic_entitlements" DROP CONSTRAINT IF EXISTS "cosmetic_entitlements_id_ck";
--> statement-breakpoint
ALTER TABLE "cosmetic_entitlements" ADD CONSTRAINT "cosmetic_entitlements_id_ck"
  CHECK ("cosmetic_id" IN ('supporter_badge', 'cookie_crumb_trail', 'cookie_cheer', 'golden_cookie_burst', 'supporter_profile_frame', 'lobby_flight', 'supporter_join_flair', 'cookie_sparkle_trail', 'app_companion_badge', 'note_trail', 'heart_trail', 'streak_star_trail', 'starter_spark_trail', 'chocolate_chip_trail', 'cherry_petal_trail', 'soul_flame_trail', 'rainbow_trail', 'lucky_clover_trail', 'cookie_rain_victory', 'totem_victory', 'firework_victory'));
--> statement-breakpoint
ALTER TABLE "cosmetic_selections" DROP CONSTRAINT IF EXISTS "cosmetic_selections_slot_cosmetic_ck";
--> statement-breakpoint
ALTER TABLE "cosmetic_selections" ADD CONSTRAINT "cosmetic_selections_slot_cosmetic_ck" CHECK (("slot", "cosmetic_id") IN (
  ('BADGE', 'supporter_badge'), ('BADGE', 'app_companion_badge'),
  ('HUB_TRAIL', 'cookie_crumb_trail'), ('HUB_TRAIL', 'cookie_sparkle_trail'),
  ('HUB_TRAIL', 'note_trail'), ('HUB_TRAIL', 'heart_trail'), ('HUB_TRAIL', 'streak_star_trail'),
  ('HUB_TRAIL', 'starter_spark_trail'), ('HUB_TRAIL', 'chocolate_chip_trail'),
  ('HUB_TRAIL', 'cherry_petal_trail'), ('HUB_TRAIL', 'soul_flame_trail'),
  ('HUB_TRAIL', 'rainbow_trail'), ('HUB_TRAIL', 'lucky_clover_trail'),
  ('EMOTE', 'cookie_cheer'),
  ('VICTORY_EFFECT', 'golden_cookie_burst'), ('VICTORY_EFFECT', 'cookie_rain_victory'),
  ('VICTORY_EFFECT', 'totem_victory'), ('VICTORY_EFFECT', 'firework_victory'),
  ('PROFILE_FRAME', 'supporter_profile_frame'),
  ('LOBBY_FLIGHT', 'lobby_flight'), ('JOIN_FLAIR', 'supporter_join_flair')
));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cosmetic_welcome_gifts" (
  "player_id" uuid PRIMARY KEY NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "cosmetic_id" varchar(64) NOT NULL,
  "equipped" boolean DEFAULT false NOT NULL,
  "edition" varchar(16) DEFAULT 'unknown' NOT NULL,
  "granted_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "cosmetic_welcome_gifts_cosmetic_ck" CHECK ("cosmetic_id" IN ('cookie_sparkle_trail')),
  CONSTRAINT "cosmetic_welcome_gifts_edition_ck" CHECK ("edition" IN ('java', 'bedrock', 'unknown'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cosmetic_welcome_gifts_time_idx"
  ON "cosmetic_welcome_gifts" ("granted_at", "edition", "equipped");
--> statement-breakpoint
REVOKE ALL ON public.cosmetic_welcome_gifts FROM PUBLIC;
--> statement-breakpoint
DO $$
DECLARE constraint_name text;
BEGIN
  IF to_regclass('public.cosmetic_first_activations') IS NOT NULL THEN
    FOR constraint_name IN
      SELECT con.conname FROM pg_constraint con
       WHERE con.conrelid = 'public.cosmetic_first_activations'::regclass
         AND con.contype = 'c'
         AND (pg_get_constraintdef(con.oid) LIKE '%cosmetic_id%'
              OR pg_get_constraintdef(con.oid) LIKE '%observed_source%')
    LOOP
      EXECUTE format('ALTER TABLE public.cosmetic_first_activations DROP CONSTRAINT %I', constraint_name);
    END LOOP;
    ALTER TABLE public.cosmetic_first_activations
      ADD CONSTRAINT cosmetic_first_activations_cosmetic_id_check CHECK (cosmetic_id IN (
        'supporter_badge', 'cookie_crumb_trail', 'cookie_cheer', 'golden_cookie_burst',
        'supporter_profile_frame', 'lobby_flight', 'supporter_join_flair', 'cookie_sparkle_trail',
        'app_companion_badge', 'note_trail', 'heart_trail', 'streak_star_trail', 'starter_spark_trail',
        'chocolate_chip_trail', 'cherry_petal_trail', 'soul_flame_trail', 'rainbow_trail',
        'lucky_clover_trail', 'cookie_rain_victory', 'totem_victory', 'firework_victory'));
    ALTER TABLE public.cosmetic_first_activations
      ADD CONSTRAINT cosmetic_first_activations_observed_source_check CHECK (observed_source IN (
        'baseline', 'selection', 'gift', 'purchase', 'grant'));
  END IF;
END $$;
--> statement-breakpoint
-- Same capture as 0019; only the provenance is new. An unknown or missing
-- setting is recorded as an ordinary player selection.
CREATE OR REPLACE FUNCTION public.capture_cosmetic_first_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  provenance text := COALESCE(NULLIF(current_setting('cookiebuild.cosmetic_source', true), ''), 'selection');
BEGIN
  IF provenance NOT IN ('selection', 'gift', 'purchase', 'grant') THEN
    provenance := 'selection';
  END IF;
  INSERT INTO public.cosmetic_first_activations
    (player_id, cosmetic_id, first_selected_at, observed_source, edition)
  VALUES (NEW.player_id, NEW.cosmetic_id, statement_timestamp(), provenance,
          public.shop_account_edition(NEW.player_id))
  ON CONFLICT (player_id, cosmetic_id) DO NOTHING;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.capture_cosmetic_first_activation() FROM PUBLIC;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS metrics;
--> statement-breakpoint
CREATE OR REPLACE VIEW metrics.shop_welcome_gifts_daily WITH (security_barrier = true) AS
SELECT date_trunc('day', granted_at, 'Europe/Paris') AS time, edition, equipped,
       count(*)::bigint AS gifted_accounts
FROM public.cosmetic_welcome_gifts
WHERE granted_at >= date_trunc('day', CURRENT_TIMESTAMP - INTERVAL '180 days', 'Europe/Paris')
GROUP BY 1, 2, 3;
--> statement-breakpoint
-- Coin purchases are ledger rows "cosmetic:<id>" written in the purchase
-- transaction (game JVM timestamps are UTC). The ledger is created by the game
-- server schema, so the view is skipped where it does not exist yet.
DO $$
BEGIN
  IF to_regclass('public.coin_transactions') IS NOT NULL THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW metrics.shop_coin_purchases_daily WITH (security_barrier = true) AS
      SELECT date_trunc('day', created_at AT TIME ZONE 'UTC', 'Europe/Paris') AS time,
             substring(source FROM 10) AS cosmetic_id,
             count(*)::bigint AS purchases,
             (-sum(amount))::bigint AS coins_spent
      FROM public.coin_transactions
      WHERE source LIKE 'cosmetic:%' AND amount < 0
        AND created_at >= (CURRENT_TIMESTAMP - INTERVAL '180 days') AT TIME ZONE 'UTC'
      GROUP BY 1, 2
    $view$;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cookiebuild_metrics') THEN
    GRANT USAGE ON SCHEMA metrics TO cookiebuild_metrics;
    GRANT SELECT ON metrics.shop_welcome_gifts_daily TO cookiebuild_metrics;
    IF to_regclass('metrics.shop_coin_purchases_daily') IS NOT NULL THEN
      GRANT SELECT ON metrics.shop_coin_purchases_daily TO cookiebuild_metrics;
    END IF;
    REVOKE ALL ON public.cosmetic_welcome_gifts FROM cookiebuild_metrics;
  END IF;
END $$;
