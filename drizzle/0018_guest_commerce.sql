CREATE TABLE IF NOT EXISTS commerce_guest_payers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash varchar(64) NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 stripe_test_customer_id varchar(255) UNIQUE, stripe_live_customer_id varchar(255) UNIQUE
);
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS payer_player_id uuid REFERENCES playerdata(id) ON DELETE RESTRICT;
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS payer_guest_id uuid REFERENCES commerce_guest_payers(id) ON DELETE RESTRICT;
UPDATE commerce_orders SET payer_player_id = player_id WHERE payer_player_id IS NULL AND payer_guest_id IS NULL;
CREATE INDEX IF NOT EXISTS commerce_orders_payer_player_idx ON commerce_orders(payer_player_id, created_at);
CREATE INDEX IF NOT EXISTS commerce_orders_payer_guest_idx ON commerce_orders(payer_guest_id, created_at);
