-- In-game login calendar state (Europe/Paris days), written by CookieDough.
-- Safe to re-run.
CREATE TABLE IF NOT EXISTS "player_login_rewards" (
  "player_id" uuid PRIMARY KEY REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "last_claim_day" date NOT NULL,
  "streak" integer NOT NULL,
  "best_streak" integer NOT NULL,
  "total_claims" integer NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "player_login_rewards_values_ck" CHECK (
    "streak" >= 1 AND "best_streak" >= "streak" AND "total_claims" >= 1
  )
);
