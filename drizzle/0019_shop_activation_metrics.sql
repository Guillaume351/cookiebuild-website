-- Internal analytics: first OBSERVED selection per account/cosmetic. Existing
-- selections are a baseline observed now, never reconstructed acquisitions.
-- Run in one transaction (Drizzle supplies it; psql callers must use -1).
CREATE SCHEMA IF NOT EXISTS metrics;
REVOKE ALL ON SCHEMA metrics FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.cosmetic_first_activations (
  player_id uuid NOT NULL REFERENCES public.playerdata(id) ON DELETE CASCADE,
  cosmetic_id varchar(64) NOT NULL CHECK (cosmetic_id IN (
    'supporter_badge', 'cookie_crumb_trail', 'cookie_cheer', 'golden_cookie_burst',
    'supporter_profile_frame', 'lobby_flight', 'supporter_join_flair', 'cookie_sparkle_trail')),
  first_selected_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  observed_source varchar(16) NOT NULL CHECK (observed_source IN ('baseline', 'selection')),
  edition varchar(16) NOT NULL CHECK (edition IN ('java', 'bedrock', 'unknown')),
  PRIMARY KEY (player_id, cosmetic_id)
);
REVOKE ALL ON public.cosmetic_first_activations FROM PUBLIC;
CREATE INDEX IF NOT EXISTS cosmetic_first_activations_time_idx
  ON public.cosmetic_first_activations (first_selected_at, cosmetic_id, edition, observed_source);
CREATE INDEX IF NOT EXISTS player_link_challenges_player_created_idx
  ON public.player_link_challenges (player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS commerce_orders_metrics_created_idx
  ON public.commerce_orders (created_at) WHERE stripe_mode = 'live';
CREATE INDEX IF NOT EXISTS commerce_orders_metrics_purchased_idx
  ON public.commerce_orders (purchased_at) WHERE stripe_mode = 'live' AND purchased_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS commerce_payments_metrics_paid_idx
  ON public.commerce_payments (paid_at) WHERE paid_at IS NOT NULL;

-- Edition describes the Minecraft account, never the web browser/device.
-- Prefer a server-recorded edition. UUID fallbacks follow Floodgate's documented
-- zero-prefix format and authenticated Java UUID v4; other formats stay unknown.
CREATE OR REPLACE FUNCTION public.shop_account_edition(account_id uuid)
RETURNS text LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
  SELECT COALESCE(
    (SELECT edition FROM (
       SELECT challenge.edition, challenge.created_at AS recorded_at
       FROM public.player_link_challenges challenge WHERE challenge.player_id = account_id
       UNION ALL
       SELECT link.edition, link.linked_at
       FROM public.mobile_player_links link
       WHERE link.player_id = account_id AND link.revoked_at IS NULL
     ) evidence WHERE edition IN ('java', 'bedrock') ORDER BY recorded_at DESC, edition LIMIT 1),
    CASE WHEN account_id::text LIKE '00000000-0000-0000-%' THEN 'bedrock'
         WHEN account_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN 'java'
         ELSE 'unknown' END);
$$;
REVOKE ALL ON FUNCTION public.shop_account_edition(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.capture_cosmetic_first_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  INSERT INTO public.cosmetic_first_activations
    (player_id, cosmetic_id, first_selected_at, observed_source, edition)
  VALUES (NEW.player_id, NEW.cosmetic_id, statement_timestamp(), 'selection',
          public.shop_account_edition(NEW.player_id))
  ON CONFLICT (player_id, cosmetic_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_cosmetic_first_activation() FROM PUBLIC;

-- A transactional table lock closes the race between initial snapshot and
-- trigger installation. No game restart is necessary; callers set lock_timeout.
LOCK TABLE public.cosmetic_selections IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO public.cosmetic_first_activations
  (player_id, cosmetic_id, first_selected_at, observed_source, edition)
SELECT player_id, cosmetic_id, statement_timestamp(), 'baseline', public.shop_account_edition(player_id)
FROM public.cosmetic_selections
ON CONFLICT (player_id, cosmetic_id) DO NOTHING;
DROP TRIGGER IF EXISTS cosmetic_first_activation_capture ON public.cosmetic_selections;
CREATE TRIGGER cosmetic_first_activation_capture
AFTER INSERT OR UPDATE OF player_id, cosmetic_id ON public.cosmetic_selections
FOR EACH ROW EXECUTE FUNCTION public.capture_cosmetic_first_activation();

CREATE OR REPLACE VIEW metrics.shop_activation_daily WITH (security_barrier = true) AS
SELECT date_trunc('day', first_selected_at, 'Europe/Paris') AS time,
       cosmetic_id, edition, observed_source, count(*)::bigint AS activated_accounts
FROM public.cosmetic_first_activations
WHERE first_selected_at >= date_trunc('day', CURRENT_TIMESTAMP - INTERVAL '180 days', 'Europe/Paris')
GROUP BY 1, 2, 3, 4;

CREATE OR REPLACE VIEW metrics.shop_activation_summary WITH (security_barrier = true) AS
SELECT cosmetic_id, edition, observed_source, count(*)::bigint AS activated_accounts,
       min(first_selected_at) AS coverage_started_at
FROM public.cosmetic_first_activations GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW metrics.shop_equipped_current WITH (security_barrier = true) AS
SELECT selection.cosmetic_id, activation.edition,
       count(DISTINCT selection.player_id)::bigint AS equipped_accounts
FROM public.cosmetic_selections selection
JOIN public.cosmetic_first_activations activation
  ON activation.player_id = selection.player_id AND activation.cosmetic_id = selection.cosmetic_id
WHERE selection.cosmetic_id = 'cookie_sparkle_trail' OR EXISTS (
  SELECT 1 FROM public.cosmetic_entitlements entitlement
  WHERE entitlement.player_id = selection.player_id AND entitlement.cosmetic_id = selection.cosmetic_id
    AND entitlement.revoked_at IS NULL
    AND (entitlement.expires_at IS NULL OR entitlement.expires_at > CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
)
GROUP BY 1, 2;

CREATE OR REPLACE VIEW metrics.shop_linked_current WITH (security_barrier = true) AS
SELECT 'commerce_session'::text AS link_type,
       COALESCE(evidence.edition,
         CASE WHEN session.player_id::text LIKE '00000000-0000-0000-%' THEN 'bedrock'
              WHEN session.player_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN 'java'
              ELSE 'unknown' END) AS edition,
       count(DISTINCT session.player_id)::bigint AS linked_accounts
FROM public.commerce_sessions session
LEFT JOIN LATERAL (
  SELECT challenge.edition FROM public.player_link_challenges challenge
  WHERE challenge.player_id = session.player_id
  ORDER BY challenge.created_at DESC, challenge.edition LIMIT 1
) evidence ON true
WHERE session.revoked_at IS NULL AND session.expires_at > CURRENT_TIMESTAMP
GROUP BY 2
UNION ALL
SELECT 'mobile_link', edition, count(DISTINCT player_id)::bigint
FROM public.mobile_player_links WHERE revoked_at IS NULL GROUP BY edition;

CREATE OR REPLACE VIEW metrics.shop_orders_daily WITH (security_barrier = true) AS
SELECT date_trunc('day', created_at, 'Europe/Paris') AS time,
       count(*)::bigint AS created_orders,
       count(*) FILTER (WHERE stripe_checkout_session_id IS NOT NULL)::bigint AS checkout_session_orders
FROM public.commerce_orders
WHERE stripe_mode = 'live' AND created_at >= date_trunc('day', CURRENT_TIMESTAMP - INTERVAL '180 days', 'Europe/Paris')
GROUP BY 1;

CREATE OR REPLACE VIEW metrics.shop_paid_orders_daily WITH (security_barrier = true) AS
SELECT date_trunc('day', purchased_at, 'Europe/Paris') AS time,
       count(*)::bigint AS paid_orders
FROM public.commerce_orders
WHERE stripe_mode = 'live' AND purchased_at >= date_trunc('day', CURRENT_TIMESTAMP - INTERVAL '180 days', 'Europe/Paris')
GROUP BY 1;

-- Cash received by payment date, adjusted by CURRENT cumulative refunds.
-- This is not refund-date cash flow, accounting revenue or Stripe-fee net.
CREATE OR REPLACE VIEW metrics.shop_receipts_daily WITH (security_barrier = true) AS
SELECT date_trunc('day', payment.paid_at, 'Europe/Paris') AS time,
       payment.currency, count(*)::bigint AS paid_payments,
       sum(payment.amount_cents)::bigint AS gross_cents,
       sum(payment.refunded_amount_cents)::bigint AS refunded_cents,
       sum(payment.amount_cents - payment.refunded_amount_cents)::bigint AS refund_adjusted_cents,
       count(*) FILTER (WHERE payment.status = 'disputed')::bigint AS disputed_payments
FROM public.commerce_payments payment
JOIN public.commerce_orders receipt_order ON receipt_order.id = payment.order_id
WHERE receipt_order.stripe_mode = 'live'
  AND payment.paid_at >= date_trunc('day', CURRENT_TIMESTAMP - INTERVAL '180 days', 'Europe/Paris')
GROUP BY 1, 2;

CREATE OR REPLACE VIEW metrics.shop_subscriptions_current WITH (security_barrier = true) AS
SELECT subscription.status, subscription.cancel_at_period_end,
       (subscription.ended_at IS NULL AND subscription.current_period_end > CURRENT_TIMESTAMP)
         IS TRUE AS current_period,
       count(*)::bigint AS subscriptions
FROM public.commerce_subscriptions subscription
JOIN public.commerce_orders subscription_order ON subscription_order.id = subscription.order_id
WHERE subscription_order.stripe_mode = 'live'
GROUP BY 1, 2, 3;

-- The role already exists in production. Local deployments without Grafana
-- may apply this migration without creating a credential-bearing login role.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cookiebuild_metrics') THEN
    GRANT USAGE ON SCHEMA metrics TO cookiebuild_metrics;
    GRANT SELECT ON metrics.shop_activation_daily, metrics.shop_activation_summary,
      metrics.shop_equipped_current, metrics.shop_linked_current, metrics.shop_orders_daily,
      metrics.shop_paid_orders_daily, metrics.shop_receipts_daily,
      metrics.shop_subscriptions_current TO cookiebuild_metrics;
    REVOKE ALL ON public.cosmetic_first_activations FROM cookiebuild_metrics;
    REVOKE ALL ON FUNCTION public.shop_account_edition(uuid) FROM cookiebuild_metrics;
    REVOKE ALL ON FUNCTION public.capture_cosmetic_first_activation() FROM cookiebuild_metrics;
    ALTER ROLE cookiebuild_metrics SET default_transaction_read_only = on;
    ALTER ROLE cookiebuild_metrics SET statement_timeout = '8s';
  END IF;
END $$;
