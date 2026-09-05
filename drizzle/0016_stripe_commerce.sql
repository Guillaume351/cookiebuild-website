ALTER TABLE "player_link_challenges"
  ADD COLUMN IF NOT EXISTS "purpose" varchar(24) DEFAULT 'mobile_link' NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "player_link_challenges_active_player_uq";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "player_link_challenges_active_player_purpose_uq"
  ON "player_link_challenges" ("player_id", "purpose")
  WHERE "consumed_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "player_link_challenges"
  DROP CONSTRAINT IF EXISTS "player_link_challenges_purpose_ck";
--> statement-breakpoint
ALTER TABLE "player_link_challenges"
  ADD CONSTRAINT "player_link_challenges_purpose_ck"
  CHECK ("purpose" IN ('mobile_link', 'commerce_session'));
--> statement-breakpoint

ALTER TABLE "cosmetic_selections"
  DROP CONSTRAINT IF EXISTS "cosmetic_selections_entitlement_fk";
--> statement-breakpoint
ALTER TABLE "cosmetic_entitlements"
  DROP CONSTRAINT IF EXISTS "cosmetic_entitlements_pkey";
--> statement-breakpoint
ALTER TABLE "cosmetic_entitlements"
  ADD CONSTRAINT "cosmetic_entitlements_pkey"
  PRIMARY KEY ("player_id", "cosmetic_id", "source");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "commerce_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "player_id" uuid NOT NULL REFERENCES "playerdata" ("id") ON DELETE CASCADE,
  "token_hash" varchar(64) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "last_seen_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  CONSTRAINT "commerce_sessions_expiry_ck" CHECK ("expires_at" > "created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_sessions_token_hash_uq"
  ON "commerce_sessions" ("token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commerce_sessions_active_player_idx"
  ON "commerce_sessions" ("player_id", "expires_at") WHERE "revoked_at" IS NULL;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "commerce_customers" (
  "player_id" uuid NOT NULL REFERENCES "playerdata" ("id") ON DELETE RESTRICT,
  "stripe_mode" varchar(8) NOT NULL,
  "stripe_customer_id" varchar(255) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "commerce_customers_pkey" PRIMARY KEY ("player_id", "stripe_mode"),
  CONSTRAINT "commerce_customers_stripe_mode_ck" CHECK ("stripe_mode" IN ('test', 'live'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_customers_stripe_customer_mode_uq"
  ON "commerce_customers" ("stripe_customer_id", "stripe_mode");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "commerce_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "player_id" uuid NOT NULL REFERENCES "playerdata" ("id") ON DELETE RESTRICT,
  "product_id" varchar(128) NOT NULL,
  "product_version" integer NOT NULL,
  "product_name" varchar(255) NOT NULL,
  "access" varchar(24) NOT NULL,
  "grants_snapshot" jsonb NOT NULL,
  "amount_ttc_cents" integer NOT NULL,
  "currency" varchar(3) DEFAULT 'EUR' NOT NULL,
  "status" varchar(32) DEFAULT 'created' NOT NULL,
  "stripe_mode" varchar(8) NOT NULL,
  "stripe_customer_id" varchar(255),
  "stripe_checkout_session_id" varchar(255),
  "stripe_subscription_id" varchar(255),
  "entitlement_source" varchar(128) NOT NULL,
  "consumer_notice_version" varchar(64) NOT NULL,
  "consumer_notice_text" text NOT NULL,
  "terms_accepted_at" timestamptz NOT NULL,
  "immediate_performance_consented_at" timestamptz,
  "withdrawal_waiver_acknowledged_at" timestamptz,
  "withdrawal_deadline" timestamptz,
  "withdrawal_status" varchar(32) DEFAULT 'not_applicable' NOT NULL,
  "withdrawal_requested_at" timestamptz,
  "withdrawal_payment_id" uuid,
  "purchased_at" timestamptz,
  "canceled_at" timestamptz,
  "refunded_at" timestamptz,
  "disputed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "commerce_orders_access_ck" CHECK ("access" IN ('permanent', 'subscription', 'none')),
  CONSTRAINT "commerce_orders_product_version_ck" CHECK ("product_version" > 0),
  CONSTRAINT "commerce_orders_grants_snapshot_ck" CHECK (
    CASE
      WHEN jsonb_typeof("grants_snapshot") <> 'array' THEN false
      WHEN "access" = 'none' THEN jsonb_array_length("grants_snapshot") = 0
      ELSE jsonb_array_length("grants_snapshot") > 0
    END
  ),
  CONSTRAINT "commerce_orders_amount_ck" CHECK ("amount_ttc_cents" > 0),
  CONSTRAINT "commerce_orders_currency_ck" CHECK ("currency" = upper("currency")),
  CONSTRAINT "commerce_orders_stripe_mode_ck" CHECK ("stripe_mode" IN ('test', 'live')),
  CONSTRAINT "commerce_orders_status_ck" CHECK ("status" IN (
    'created', 'checkout_open', 'paid', 'active', 'past_due', 'canceling', 'canceled',
    'expired', 'partially_refunded', 'refunded', 'disputed', 'failed'
  )),
  CONSTRAINT "commerce_orders_withdrawal_status_ck" CHECK ("withdrawal_status" IN (
    'not_applicable', 'eligible', 'waived', 'requested', 'completed', 'expired'
  ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_orders_checkout_session_uq"
  ON "commerce_orders" ("stripe_checkout_session_id")
  WHERE "stripe_checkout_session_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_orders_subscription_uq"
  ON "commerce_orders" ("stripe_subscription_id")
  WHERE "stripe_subscription_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_orders_entitlement_source_uq"
  ON "commerce_orders" ("entitlement_source");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_orders_active_product_uq"
  ON "commerce_orders" ("player_id", "product_id")
  WHERE "access" <> 'none' AND "status" IN ('created', 'checkout_open', 'paid', 'active', 'past_due', 'canceling', 'disputed', 'partially_refunded');
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commerce_orders_player_created_idx"
  ON "commerce_orders" ("player_id", "created_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "commerce_subscriptions" (
  "stripe_subscription_id" varchar(255) PRIMARY KEY,
  "order_id" uuid NOT NULL REFERENCES "commerce_orders" ("id") ON DELETE RESTRICT,
  "player_id" uuid NOT NULL REFERENCES "playerdata" ("id") ON DELETE RESTRICT,
  "product_id" varchar(128) NOT NULL,
  "status" varchar(32) NOT NULL,
  "current_period_end" timestamptz,
  "cancel_at_period_end" boolean DEFAULT false NOT NULL,
  "ended_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_subscriptions_order_uq"
  ON "commerce_subscriptions" ("order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commerce_subscriptions_player_idx"
  ON "commerce_subscriptions" ("player_id", "updated_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "commerce_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "commerce_orders" ("id") ON DELETE RESTRICT,
  "stripe_payment_intent_id" varchar(255),
  "stripe_charge_id" varchar(255),
  "stripe_invoice_id" varchar(255),
  "entitlement_source" varchar(128),
  "coverage_expires_at" timestamptz,
  "restoration_source" varchar(128),
  "amount_cents" integer NOT NULL,
  "refunded_amount_cents" integer DEFAULT 0 NOT NULL,
  "currency" varchar(3) NOT NULL,
  "status" varchar(32) NOT NULL,
  "paid_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "commerce_payments_amount_ck" CHECK ("amount_cents" > 0),
  CONSTRAINT "commerce_payments_refund_ck"
    CHECK ("refunded_amount_cents" >= 0 AND "refunded_amount_cents" <= "amount_cents")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_payments_payment_intent_uq"
  ON "commerce_payments" ("stripe_payment_intent_id")
  WHERE "stripe_payment_intent_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_payments_charge_uq"
  ON "commerce_payments" ("stripe_charge_id")
  WHERE "stripe_charge_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_payments_invoice_uq"
  ON "commerce_payments" ("stripe_invoice_id")
  WHERE "stripe_invoice_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commerce_payments_order_idx"
  ON "commerce_payments" ("order_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commerce_payments_entitlement_source_idx"
  ON "commerce_payments" ("order_id", "entitlement_source")
  WHERE "entitlement_source" IS NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'commerce_orders_withdrawal_payment_fk'
      AND conrelid = 'commerce_orders'::regclass
  ) THEN
    ALTER TABLE "commerce_orders"
      ADD CONSTRAINT "commerce_orders_withdrawal_payment_fk"
      FOREIGN KEY ("withdrawal_payment_id") REFERENCES "commerce_payments" ("id") ON DELETE RESTRICT;
  END IF;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "commerce_webhook_events" (
  "stripe_event_id" varchar(255) PRIMARY KEY,
  "event_type" varchar(128) NOT NULL,
  "object_id" varchar(255),
  "livemode" boolean NOT NULL,
  "status" varchar(16) DEFAULT 'received' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamptz DEFAULT now() NOT NULL,
  "locked_at" timestamptz,
  "lock_token" uuid,
  "processed_at" timestamptz,
  "last_error" varchar(500),
  "received_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "commerce_webhook_events_status_ck"
    CHECK ("status" IN ('received', 'processing', 'processed', 'failed'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commerce_webhook_events_pending_idx"
  ON "commerce_webhook_events" ("status", "next_attempt_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "commerce_order_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "commerce_orders" ("id") ON DELETE CASCADE,
  "dedupe_key" varchar(320) NOT NULL,
  "event_id" varchar(255),
  "kind" varchar(64) NOT NULL,
  "status" varchar(32) NOT NULL,
  "amount_cents" integer,
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "occurred_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_order_history_dedupe_uq"
  ON "commerce_order_history" ("dedupe_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commerce_order_history_order_idx"
  ON "commerce_order_history" ("order_id", "occurred_at");
