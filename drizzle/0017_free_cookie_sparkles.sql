ALTER TABLE "cosmetic_entitlements" DROP CONSTRAINT IF EXISTS "cosmetic_entitlements_id_ck";
--> statement-breakpoint
ALTER TABLE "cosmetic_entitlements" ADD CONSTRAINT "cosmetic_entitlements_id_ck"
  CHECK ("cosmetic_id" IN ('supporter_badge', 'cookie_crumb_trail', 'cookie_cheer', 'golden_cookie_burst', 'supporter_profile_frame', 'lobby_flight', 'supporter_join_flair', 'cookie_sparkle_trail'));
--> statement-breakpoint
ALTER TABLE "cosmetic_selections" DROP CONSTRAINT IF EXISTS "cosmetic_selections_slot_cosmetic_ck";
--> statement-breakpoint
ALTER TABLE "cosmetic_selections" ADD CONSTRAINT "cosmetic_selections_slot_cosmetic_ck" CHECK (("slot", "cosmetic_id") IN (
  ('BADGE', 'supporter_badge'), ('HUB_TRAIL', 'cookie_crumb_trail'), ('HUB_TRAIL', 'cookie_sparkle_trail'),
  ('EMOTE', 'cookie_cheer'), ('VICTORY_EFFECT', 'golden_cookie_burst'), ('PROFILE_FRAME', 'supporter_profile_frame'),
  ('LOBBY_FLIGHT', 'lobby_flight'), ('JOIN_FLAIR', 'supporter_join_flair')
));
