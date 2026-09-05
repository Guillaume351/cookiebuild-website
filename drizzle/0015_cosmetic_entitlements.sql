CREATE TABLE IF NOT EXISTS "cosmetic_entitlements" (
  "player_id" uuid NOT NULL,
  "cosmetic_id" varchar(64) NOT NULL,
  "source" varchar(128) NOT NULL,
  "granted_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp,
  "revoked_at" timestamp,
  CONSTRAINT "cosmetic_entitlements_pkey" PRIMARY KEY ("player_id", "cosmetic_id"),
  CONSTRAINT "cosmetic_entitlements_player_id_playerdata_id_fk"
    FOREIGN KEY ("player_id") REFERENCES "playerdata" ("id") ON DELETE CASCADE,
  CONSTRAINT "cosmetic_entitlements_id_ck"
    CHECK ("cosmetic_id" IN ('supporter_badge', 'cookie_crumb_trail', 'cookie_cheer', 'golden_cookie_burst', 'supporter_profile_frame', 'lobby_flight', 'supporter_join_flair')),
  CONSTRAINT "cosmetic_entitlements_source_ck" CHECK (length(btrim("source")) > 0),
  CONSTRAINT "cosmetic_entitlements_expiry_ck"
    CHECK ("expires_at" IS NULL OR "expires_at" > "granted_at"),
  CONSTRAINT "cosmetic_entitlements_revocation_ck"
    CHECK ("revoked_at" IS NULL OR "revoked_at" >= "granted_at")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cosmetic_entitlements_active_player_idx"
  ON "cosmetic_entitlements" ("player_id", "granted_at")
  WHERE "revoked_at" IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cosmetic_selections" (
  "player_id" uuid NOT NULL,
  "slot" varchar(32) NOT NULL,
  "cosmetic_id" varchar(64) NOT NULL,
  "selected_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "cosmetic_selections_pkey" PRIMARY KEY ("player_id", "slot"),
  CONSTRAINT "cosmetic_selections_player_id_playerdata_id_fk"
    FOREIGN KEY ("player_id") REFERENCES "playerdata" ("id") ON DELETE CASCADE,
  CONSTRAINT "cosmetic_selections_entitlement_fk"
    FOREIGN KEY ("player_id", "cosmetic_id")
    REFERENCES "cosmetic_entitlements" ("player_id", "cosmetic_id") ON DELETE CASCADE,
  CONSTRAINT "cosmetic_selections_slot_cosmetic_ck" CHECK (("slot", "cosmetic_id") IN (
    ('BADGE', 'supporter_badge'),
    ('HUB_TRAIL', 'cookie_crumb_trail'),
    ('EMOTE', 'cookie_cheer'),
    ('VICTORY_EFFECT', 'golden_cookie_burst'),
    ('PROFILE_FRAME', 'supporter_profile_frame'),
    ('LOBBY_FLIGHT', 'lobby_flight'),
    ('JOIN_FLAIR', 'supporter_join_flair')
  ))
);
