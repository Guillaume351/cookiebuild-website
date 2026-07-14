CREATE TABLE IF NOT EXISTS "player_friendships" (
  "player_low_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "player_high_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "requested_by_player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "status" varchar(16) DEFAULT 'pending' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "accepted_at" timestamptz,
  PRIMARY KEY ("player_low_id", "player_high_id"),
  CONSTRAINT "player_friendships_order_ck" CHECK ("player_low_id" < "player_high_id"),
  CONSTRAINT "player_friendships_requester_ck" CHECK (
    "requested_by_player_id" IN ("player_low_id", "player_high_id")
  ),
  CONSTRAINT "player_friendships_status_ck" CHECK ("status" IN ('pending', 'accepted')),
  CONSTRAINT "player_friendships_accepted_at_ck" CHECK (
    ("status" = 'pending' AND "accepted_at" IS NULL)
    OR ("status" = 'accepted' AND "accepted_at" IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_friendships_low_status_idx"
  ON "player_friendships" ("player_low_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_friendships_high_status_idx"
  ON "player_friendships" ("player_high_id", "status");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "player_blocks" (
  "blocker_player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "blocked_player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("blocker_player_id", "blocked_player_id"),
  CONSTRAINT "player_blocks_self_ck" CHECK ("blocker_player_id" <> "blocked_player_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_blocks_blocked_idx"
  ON "player_blocks" ("blocked_player_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "player_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reporter_player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "reported_player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "reason" varchar(32) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "player_reports_self_ck" CHECK ("reporter_player_id" <> "reported_player_id"),
  CONSTRAINT "player_reports_reason_ck" CHECK (
    "reason" IN (
      'spam',
      'harassment',
      'hate_or_discrimination',
      'sexual_content',
      'threats',
      'impersonation',
      'cheating',
      'inappropriate_name'
    )
  )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_reports_reporter_created_idx"
  ON "player_reports" ("reporter_player_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_reports_reported_created_idx"
  ON "player_reports" ("reported_player_id", "created_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "player_parties" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "leader_player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "state" varchar(16) DEFAULT 'active' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "disbanded_at" timestamptz,
  CONSTRAINT "player_parties_state_ck" CHECK ("state" IN ('active', 'disbanded')),
  CONSTRAINT "player_parties_disbanded_at_ck" CHECK (
    ("state" = 'active' AND "disbanded_at" IS NULL)
    OR ("state" = 'disbanded' AND "disbanded_at" IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "player_parties_active_leader_uq"
  ON "player_parties" ("leader_player_id") WHERE "state" = 'active';
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "player_party_members" (
  "party_id" uuid NOT NULL REFERENCES "player_parties"("id") ON DELETE CASCADE,
  "player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "role" varchar(16) DEFAULT 'member' NOT NULL,
  "joined_at" timestamptz DEFAULT now() NOT NULL,
  "left_at" timestamptz,
  PRIMARY KEY ("party_id", "player_id"),
  CONSTRAINT "player_party_members_role_ck" CHECK ("role" IN ('leader', 'member'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "player_party_members_active_player_uq"
  ON "player_party_members" ("player_id") WHERE "left_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_party_members_active_party_idx"
  ON "player_party_members" ("party_id") WHERE "left_at" IS NULL;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "player_party_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "party_id" uuid NOT NULL REFERENCES "player_parties"("id") ON DELETE CASCADE,
  "inviter_player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "invitee_player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "status" varchar(16) DEFAULT 'pending' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz DEFAULT (now() + interval '15 minutes') NOT NULL,
  "responded_at" timestamptz,
  CONSTRAINT "player_party_invites_self_ck" CHECK ("inviter_player_id" <> "invitee_player_id"),
  CONSTRAINT "player_party_invites_status_ck" CHECK (
    "status" IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')
  ),
  CONSTRAINT "player_party_invites_response_ck" CHECK (
    ("status" = 'pending' AND "responded_at" IS NULL)
    OR ("status" <> 'pending' AND "responded_at" IS NOT NULL)
  ),
  CONSTRAINT "player_party_invites_expiry_ck" CHECK ("expires_at" > "created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "player_party_invites_pending_party_invitee_uq"
  ON "player_party_invites" ("party_id", "invitee_player_id") WHERE "status" = 'pending';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_party_invites_invitee_status_idx"
  ON "player_party_invites" ("invitee_player_id", "status", "expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_party_invites_party_status_idx"
  ON "player_party_invites" ("party_id", "status", "expires_at");
