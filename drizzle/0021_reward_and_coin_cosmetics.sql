-- Cosmetics that are never sold for money: the reward-only 📱 app companion badge
-- (mobile link) and streak star trail (login calendar day 7), plus the in-game
-- coin-shop trails. Constraints only widen. Safe to re-run in one transaction.
ALTER TABLE "cosmetic_entitlements" DROP CONSTRAINT IF EXISTS "cosmetic_entitlements_id_ck";
--> statement-breakpoint
ALTER TABLE "cosmetic_entitlements" ADD CONSTRAINT "cosmetic_entitlements_id_ck"
  CHECK ("cosmetic_id" IN ('supporter_badge', 'cookie_crumb_trail', 'cookie_cheer', 'golden_cookie_burst', 'supporter_profile_frame', 'lobby_flight', 'supporter_join_flair', 'cookie_sparkle_trail', 'app_companion_badge', 'note_trail', 'heart_trail', 'streak_star_trail'));
--> statement-breakpoint
ALTER TABLE "cosmetic_selections" DROP CONSTRAINT IF EXISTS "cosmetic_selections_slot_cosmetic_ck";
--> statement-breakpoint
ALTER TABLE "cosmetic_selections" ADD CONSTRAINT "cosmetic_selections_slot_cosmetic_ck" CHECK (("slot", "cosmetic_id") IN (
  ('BADGE', 'supporter_badge'), ('BADGE', 'app_companion_badge'),
  ('HUB_TRAIL', 'cookie_crumb_trail'), ('HUB_TRAIL', 'cookie_sparkle_trail'),
  ('HUB_TRAIL', 'note_trail'), ('HUB_TRAIL', 'heart_trail'), ('HUB_TRAIL', 'streak_star_trail'),
  ('EMOTE', 'cookie_cheer'), ('VICTORY_EFFECT', 'golden_cookie_burst'), ('PROFILE_FRAME', 'supporter_profile_frame'),
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
        'app_companion_badge', 'note_trail', 'heart_trail', 'streak_star_trail'));
  END IF;
END $$;
