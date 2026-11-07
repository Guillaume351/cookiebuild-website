-- Christmas theme (release christmas-20261107).
-- 1. Three new cosmetics: Snowflake Trail (450 coins) and Snowstorm Victory
--    (900 coins) are bought in game with earned coins during the Christmas
--    season only (owners keep them); Candy Cane Trail rewards finding the 13
--    presents hidden in the lobby and is never sold. Constraints only widen,
--    following 0021/0025/0026/0027: every earlier id, Halloween ones included,
--    is kept.
-- 2. metrics.seasonal_collectibles_daily gets the Christmas editions in its
--    goals: the lobby present hunt 'christmas-2026' (13 presents) and the
--    advent calendar 'christmas-2026-advent' (24 daily gifts, 1-24 December),
--    both stored by the game in seasonal_collectibles (0027). Same columns, so
--    CREATE OR REPLACE keeps the view's owner, grants and dependants.
-- No table is created: seasonal_collectibles (0027) stays owned by the
-- migration role, which is also the game server's role (cookie), with no grant.
-- Safe to re-run. Run in one transaction (Drizzle supplies it; psql callers use -1).
ALTER TABLE "cosmetic_entitlements" DROP CONSTRAINT IF EXISTS "cosmetic_entitlements_id_ck";
--> statement-breakpoint
ALTER TABLE "cosmetic_entitlements" ADD CONSTRAINT "cosmetic_entitlements_id_ck"
  CHECK ("cosmetic_id" IN ('supporter_badge', 'cookie_crumb_trail', 'cookie_cheer', 'golden_cookie_burst', 'supporter_profile_frame', 'lobby_flight', 'supporter_join_flair', 'cookie_sparkle_trail', 'app_companion_badge', 'note_trail', 'heart_trail', 'streak_star_trail', 'starter_spark_trail', 'chocolate_chip_trail', 'cherry_petal_trail', 'soul_flame_trail', 'rainbow_trail', 'lucky_clover_trail', 'cookie_rain_victory', 'totem_victory', 'firework_victory', 'pumpkin_trail', 'witch_spell_victory', 'will_o_wisp_trail', 'snowflake_trail', 'snowstorm_victory', 'candy_cane_trail'));
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
  ('HUB_TRAIL', 'snowflake_trail'), ('HUB_TRAIL', 'candy_cane_trail'),
  ('EMOTE', 'cookie_cheer'),
  ('VICTORY_EFFECT', 'golden_cookie_burst'), ('VICTORY_EFFECT', 'cookie_rain_victory'),
  ('VICTORY_EFFECT', 'totem_victory'), ('VICTORY_EFFECT', 'firework_victory'),
  ('VICTORY_EFFECT', 'witch_spell_victory'), ('VICTORY_EFFECT', 'snowstorm_victory'),
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
        'pumpkin_trail', 'witch_spell_victory', 'will_o_wisp_trail',
        'snowflake_trail', 'snowstorm_victory', 'candy_cane_trail'));
  END IF;
END $$;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS metrics;
--> statement-breakpoint
-- Per Paris day and edition: players who found at least one collectible that
-- day, collectibles found, and players whose last missing collectible was found
-- that day. Each edition's collectible count is listed in "goals": the
-- Halloween and Christmas lobby hunts (13 each) and the advent calendar (24).
CREATE OR REPLACE VIEW metrics.seasonal_collectibles_daily WITH (security_barrier = true) AS
WITH goals (theme_id, collectibles_total) AS (
  VALUES ('halloween-2026'::text, 13),
         ('christmas-2026'::text, 13),
         ('christmas-2026-advent'::text, 24)
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
