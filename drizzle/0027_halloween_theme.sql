-- Halloween theme (release halloween-20261012).
-- 1. Three new cosmetics: Pumpkin Trail and Witch Spell Victory are bought in
--    game with earned coins during the Halloween season only (owners keep them),
--    Will-o'-the-wisp Trail rewards finding the 13 hidden lobby pumpkins and is
--    never sold. Constraints only widen, following 0021/0025/0026.
-- 2. seasonal_collectibles: one row per player, hunt edition and hidden
--    collectible found (Halloween pumpkins now, reusable for Christmas gifts).
--    theme_id holds the hunt edition (e.g. 'halloween-2026'), so each year's
--    hunt starts fresh. Written by the game server (INSERT ... ON CONFLICT DO
--    NOTHING) and read back per player and edition. Rows stay after the season.
-- 3. metrics.seasonal_collectibles_daily: aggregate hunt progress for Grafana.
-- Safe to re-run. Run in one transaction (Drizzle supplies it; psql callers use -1).
ALTER TABLE "cosmetic_entitlements" DROP CONSTRAINT IF EXISTS "cosmetic_entitlements_id_ck";
--> statement-breakpoint
ALTER TABLE "cosmetic_entitlements" ADD CONSTRAINT "cosmetic_entitlements_id_ck"
  CHECK ("cosmetic_id" IN ('supporter_badge', 'cookie_crumb_trail', 'cookie_cheer', 'golden_cookie_burst', 'supporter_profile_frame', 'lobby_flight', 'supporter_join_flair', 'cookie_sparkle_trail', 'app_companion_badge', 'note_trail', 'heart_trail', 'streak_star_trail', 'starter_spark_trail', 'chocolate_chip_trail', 'cherry_petal_trail', 'soul_flame_trail', 'rainbow_trail', 'lucky_clover_trail', 'cookie_rain_victory', 'totem_victory', 'firework_victory', 'pumpkin_trail', 'witch_spell_victory', 'will_o_wisp_trail'));
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
  ('HUB_TRAIL', 'pumpkin_trail'), ('HUB_TRAIL', 'will_o_wisp_trail'),
  ('EMOTE', 'cookie_cheer'),
  ('VICTORY_EFFECT', 'golden_cookie_burst'), ('VICTORY_EFFECT', 'cookie_rain_victory'),
  ('VICTORY_EFFECT', 'totem_victory'), ('VICTORY_EFFECT', 'firework_victory'),
  ('VICTORY_EFFECT', 'witch_spell_victory'),
  ('PROFILE_FRAME', 'supporter_profile_frame'),
  ('LOBBY_FLIGHT', 'lobby_flight'), ('JOIN_FLAIR', 'supporter_join_flair')
));
--> statement-breakpoint
DO $$
DECLARE constraint_name text;
BEGIN
  IF to_regclass('public.cosmetic_first_activations') IS NOT NULL THEN
    FOR constraint_name IN
      SELECT con.conname FROM pg_constraint con
       WHERE con.conrelid = 'public.cosmetic_first_activations'::regclass
         AND con.contype = 'c'
         AND pg_get_constraintdef(con.oid) LIKE '%cosmetic_id%'
    LOOP
      EXECUTE format('ALTER TABLE public.cosmetic_first_activations DROP CONSTRAINT %I', constraint_name);
    END LOOP;
    ALTER TABLE public.cosmetic_first_activations
      ADD CONSTRAINT cosmetic_first_activations_cosmetic_id_check CHECK (cosmetic_id IN (
        'supporter_badge', 'cookie_crumb_trail', 'cookie_cheer', 'golden_cookie_burst',
        'supporter_profile_frame', 'lobby_flight', 'supporter_join_flair', 'cookie_sparkle_trail',
        'app_companion_badge', 'note_trail', 'heart_trail', 'streak_star_trail', 'starter_spark_trail',
        'chocolate_chip_trail', 'cherry_petal_trail', 'soul_flame_trail', 'rainbow_trail',
        'lucky_clover_trail', 'cookie_rain_victory', 'totem_victory', 'firework_victory',
        'pumpkin_trail', 'witch_spell_victory', 'will_o_wisp_trail'));
  END IF;
END $$;
--> statement-breakpoint
-- Like cosmetic_welcome_gifts (0026), the table is owned by the migration role,
-- which is also the game server's database role: no extra grant is needed.
CREATE TABLE IF NOT EXISTS "seasonal_collectibles" (
  "player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "theme_id" varchar(32) NOT NULL,
  "collectible_id" varchar(64) NOT NULL,
  "found_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("player_id", "theme_id", "collectible_id"),
  CONSTRAINT "seasonal_collectibles_theme_id_ck" CHECK (length(btrim("theme_id")) > 0),
  CONSTRAINT "seasonal_collectibles_collectible_id_ck" CHECK (length(btrim("collectible_id")) > 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seasonal_collectibles_theme_found_idx"
  ON "seasonal_collectibles" ("theme_id", "found_at");
--> statement-breakpoint
REVOKE ALL ON public.seasonal_collectibles FROM PUBLIC;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS metrics;
--> statement-breakpoint
-- Per Paris day and hunt edition: players who found at least one collectible
-- that day, collectibles found, and players whose last missing collectible was
-- found that day. Each edition's collectible count is listed in "goals"
-- (a new edition, e.g. Christmas, adds a row).
CREATE OR REPLACE VIEW metrics.seasonal_collectibles_daily WITH (security_barrier = true) AS
WITH goals (theme_id, collectibles_total) AS (
  VALUES ('halloween-2026'::text, 13)
), ranked AS (
  SELECT found.theme_id::text AS theme_id, found.player_id, found.found_at,
         row_number() OVER (PARTITION BY found.theme_id, found.player_id
                            ORDER BY found.found_at, found.collectible_id) AS find_number
  FROM public.seasonal_collectibles found
)
SELECT date_trunc('day', ranked.found_at, 'Europe/Paris') AS time,
       ranked.theme_id,
       count(DISTINCT ranked.player_id)::bigint AS players,
       count(*)::bigint AS collectibles_found,
       count(*) FILTER (WHERE ranked.find_number = goals.collectibles_total)::bigint AS players_completed
FROM ranked
LEFT JOIN goals ON goals.theme_id = ranked.theme_id
WHERE ranked.found_at >= date_trunc('day', CURRENT_TIMESTAMP - INTERVAL '180 days', 'Europe/Paris')
GROUP BY 1, 2;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cookiebuild_metrics') THEN
    GRANT USAGE ON SCHEMA metrics TO cookiebuild_metrics;
    GRANT SELECT ON metrics.seasonal_collectibles_daily TO cookiebuild_metrics;
    REVOKE ALL ON public.seasonal_collectibles FROM cookiebuild_metrics;
  END IF;
END $$;
