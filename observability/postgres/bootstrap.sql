\set ON_ERROR_STOP on

SELECT format('CREATE ROLE cookiebuild_metrics LOGIN PASSWORD %L', :'grafana_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cookiebuild_metrics') \gexec
SELECT format('ALTER ROLE cookiebuild_metrics PASSWORD %L', :'grafana_password') \gexec
ALTER ROLE cookiebuild_metrics SET default_transaction_read_only = on;
ALTER ROLE cookiebuild_metrics SET search_path = metrics, pg_catalog;
ALTER ROLE cookiebuild_metrics SET statement_timeout = '8s';
ALTER ROLE cookiebuild_metrics SET lock_timeout = '1s';
ALTER ROLE cookiebuild_metrics SET idle_in_transaction_session_timeout = '15s';
GRANT CONNECT ON DATABASE cookiebuild_prod TO cookiebuild_metrics;

SELECT format('CREATE ROLE cookiebuild_exporter LOGIN PASSWORD %L', :'exporter_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cookiebuild_exporter') \gexec
SELECT format('ALTER ROLE cookiebuild_exporter PASSWORD %L', :'exporter_password') \gexec
GRANT pg_monitor TO cookiebuild_exporter;
SELECT format('GRANT CONNECT ON DATABASE %I TO cookiebuild_exporter', current_database()) \gexec

CREATE SCHEMA IF NOT EXISTS metrics;
REVOKE ALL ON SCHEMA metrics FROM PUBLIC;

CREATE OR REPLACE VIEW metrics.usage_hourly WITH (security_barrier = true) AS
SELECT date_trunc('hour', start_time) AS time,
       count(*)::bigint AS sessions,
       count(DISTINCT player_id)::bigint AS active_players,
       avg(COALESCE(duration, EXTRACT(EPOCH FROM (end_time - start_time)) * 1000)) / 60000.0 AS average_minutes,
       count(*) FILTER (WHERE server_crash)::bigint AS crashes
FROM public.player_sessions
WHERE start_time >= CURRENT_TIMESTAMP - INTERVAL '180 days'
  AND end_time IS NOT NULL
GROUP BY 1;

CREATE OR REPLACE VIEW metrics.matches_hourly WITH (security_barrier = true) AS
SELECT date_trunc('hour', starttime) AS time,
       gametype,
       count(*)::bigint AS completed_matches,
       avg(EXTRACT(EPOCH FROM (endtime - starttime))) AS average_seconds
FROM public.matches
WHERE starttime >= CURRENT_TIMESTAMP - INTERVAL '180 days'
  AND endtime IS NOT NULL
GROUP BY 1, 2;

CREATE OR REPLACE VIEW metrics.usage_summary WITH (security_barrier = true) AS
SELECT (SELECT count(*) FROM public.playerdata)::bigint AS historical_players,
       (SELECT count(DISTINCT player_id) FROM public.player_sessions WHERE start_time >= CURRENT_TIMESTAMP - INTERVAL '24 hours')::bigint AS active_24h,
       (SELECT count(DISTINCT player_id) FROM public.player_sessions WHERE start_time >= CURRENT_TIMESTAMP - INTERVAL '7 days')::bigint AS active_7d,
       (SELECT count(*) FROM (
          SELECT player_id FROM public.player_sessions GROUP BY player_id
          HAVING min(start_time) >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        ) newcomers)::bigint AS new_7d,
       (SELECT count(*) FROM public.matches WHERE endtime IS NOT NULL AND starttime >= CURRENT_TIMESTAMP - INTERVAL '24 hours')::bigint AS matches_24h,
       (SELECT count(*) FROM public.matches WHERE endtime IS NOT NULL AND starttime >= CURRENT_TIMESTAMP - INTERVAL '7 days')::bigint AS matches_7d,
       (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY COALESCE(duration, EXTRACT(EPOCH FROM (end_time - start_time)) * 1000)) / 60000.0
          FROM public.player_sessions WHERE end_time IS NOT NULL AND start_time >= CURRENT_TIMESTAMP - INTERVAL '7 days') AS session_p50_minutes,
       (SELECT percentile_cont(0.9) WITHIN GROUP (ORDER BY COALESCE(duration, EXTRACT(EPOCH FROM (end_time - start_time)) * 1000)) / 60000.0
          FROM public.player_sessions WHERE end_time IS NOT NULL AND start_time >= CURRENT_TIMESTAMP - INTERVAL '7 days') AS session_p90_minutes;

-- Sessions are attributed to their UTC start day. Only completed sessions
-- contribute play time, so crashes or stale open rows cannot inflate it forever.
CREATE OR REPLACE VIEW metrics.skyblock_sessions_daily WITH (security_barrier = true) AS
SELECT (date_trunc('day', started_at AT TIME ZONE 'UTC'))::timestamp AS time,
       platform,
       count(*)::bigint AS sessions,
       count(DISTINCT player_id)::bigint AS active_players,
       sum(duration_seconds)::bigint AS play_seconds,
       avg(duration_seconds)::double precision AS average_session_seconds,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_seconds)::double precision AS p50_session_seconds,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY duration_seconds)::double precision AS p90_session_seconds
FROM public.skyblock_sessions
WHERE started_at >= CURRENT_TIMESTAMP - INTERVAL '180 days'
  AND ended_at IS NOT NULL
  AND duration_seconds IS NOT NULL
GROUP BY 1, 2;

CREATE OR REPLACE VIEW metrics.skyblock_session_summary WITH (security_barrier = true) AS
SELECT count(*) FILTER (WHERE started_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours')::bigint AS sessions_24h,
       count(DISTINCT player_id) FILTER (
           WHERE started_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours')::bigint AS active_players_24h,
       COALESCE(sum(duration_seconds) FILTER (
           WHERE ended_at IS NOT NULL AND started_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'), 0)::bigint
           AS play_seconds_24h,
       COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_seconds) FILTER (
           WHERE ended_at IS NOT NULL AND started_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'), 0)::double precision
           AS p50_session_seconds_7d,
       COALESCE(percentile_cont(0.9) WITHIN GROUP (ORDER BY duration_seconds) FILTER (
           WHERE ended_at IS NOT NULL AND started_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'), 0)::double precision
           AS p90_session_seconds_7d,
       count(*) FILTER (WHERE ended_at IS NULL)::bigint AS open_sessions,
       count(*) FILTER (WHERE ended_at IS NULL
           AND started_at < CURRENT_TIMESTAMP - INTERVAL '12 hours')::bigint AS orphan_sessions
FROM public.skyblock_sessions
WHERE started_at >= CURRENT_TIMESTAMP - INTERVAL '180 days'
   OR ended_at IS NULL;

-- Retention is exact UTC calendar-day return (D1, D7 and D30), not a rolling
-- active-player proxy. Rates remain NULL until each cohort is old enough.
CREATE OR REPLACE VIEW metrics.skyblock_retention_cohorts WITH (security_barrier = true) AS
WITH first_seen AS (
    SELECT player_id, (min(started_at) AT TIME ZONE 'UTC')::date AS cohort_date
    FROM public.skyblock_sessions
    GROUP BY player_id
), daily_presence AS (
    SELECT DISTINCT player_id, (started_at AT TIME ZONE 'UTC')::date AS play_date
    FROM public.skyblock_sessions
    WHERE started_at >= CURRENT_TIMESTAMP - INTERVAL '151 days'
)
SELECT first_seen.cohort_date,
       count(*)::bigint AS new_players,
       count(d1.player_id)::bigint AS retained_d1,
       count(d7.player_id)::bigint AS retained_d7,
       count(d30.player_id)::bigint AS retained_d30,
       CASE WHEN first_seen.cohort_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 1
            THEN count(d1.player_id)::double precision / NULLIF(count(*), 0) END AS retention_d1,
       CASE WHEN first_seen.cohort_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 7
            THEN count(d7.player_id)::double precision / NULLIF(count(*), 0) END AS retention_d7,
       CASE WHEN first_seen.cohort_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 30
            THEN count(d30.player_id)::double precision / NULLIF(count(*), 0) END AS retention_d30
FROM first_seen
LEFT JOIN daily_presence d1 ON d1.player_id = first_seen.player_id
    AND d1.play_date = first_seen.cohort_date + 1
LEFT JOIN daily_presence d7 ON d7.player_id = first_seen.player_id
    AND d7.play_date = first_seen.cohort_date + 7
LEFT JOIN daily_presence d30 ON d30.player_id = first_seen.player_id
    AND d30.play_date = first_seen.cohort_date + 30
WHERE first_seen.cohort_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 120
GROUP BY first_seen.cohort_date;

CREATE OR REPLACE VIEW metrics.skyblock_retention_summary WITH (security_barrier = true) AS
SELECT COALESCE(sum(retained_d1) FILTER (
           WHERE cohort_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 1), 0)::bigint AS retained_d1,
       COALESCE(sum(new_players) FILTER (
           WHERE cohort_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 1), 0)::bigint AS eligible_d1,
       COALESCE(sum(retained_d7) FILTER (
           WHERE cohort_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 7), 0)::bigint AS retained_d7,
       COALESCE(sum(new_players) FILTER (
           WHERE cohort_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 7), 0)::bigint AS eligible_d7,
       COALESCE(sum(retained_d30) FILTER (
           WHERE cohort_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 30), 0)::bigint AS retained_d30,
       COALESCE(sum(new_players) FILTER (
           WHERE cohort_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 30), 0)::bigint AS eligible_d30,
       COALESCE((sum(retained_d1) FILTER (
           WHERE cohort_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 1))::double precision
           / NULLIF(sum(new_players) FILTER (
               WHERE cohort_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 1), 0), 0) AS retention_d1,
       COALESCE((sum(retained_d7) FILTER (
           WHERE cohort_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 7))::double precision
           / NULLIF(sum(new_players) FILTER (
               WHERE cohort_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 7), 0), 0) AS retention_d7,
       COALESCE((sum(retained_d30) FILTER (
           WHERE cohort_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 30))::double precision
           / NULLIF(sum(new_players) FILTER (
               WHERE cohort_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 30), 0), 0) AS retention_d30
FROM metrics.skyblock_retention_cohorts
WHERE cohort_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 90;

-- market:buy and market:sell are the two sides of a transfer and therefore are
-- never faucets/sinks. The associated fee is the only monetary destruction.
CREATE OR REPLACE VIEW metrics.skyblock_economy_hourly WITH (security_barrier = true) AS
WITH actual_flows AS (
    SELECT created_at,
           CASE
             WHEN source LIKE 'merchant:sell:%' THEN 'merchant_sell'
             WHEN source LIKE 'merchant:buy:%' THEN 'merchant_buy'
             WHEN source LIKE 'quest:%' THEN 'quest'
             WHEN source LIKE 'objective:%' THEN 'objective'
             WHEN source LIKE 'collection:%' THEN 'collection'
             WHEN source LIKE 'worker:tier:%' THEN 'worker_upgrade'
             WHEN source LIKE 'generator:tier:%' THEN 'generator_upgrade'
             ELSE 'other'
           END AS source,
           CASE WHEN amount > 0 THEN amount ELSE 0 END::bigint AS minted_coins,
           CASE WHEN amount < 0 THEN -amount ELSE 0 END::bigint AS burned_coins
    FROM public.skyblock_coin_transactions
    WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '180 days'
      AND source NOT LIKE 'market:%'
      AND source NOT LIKE 'migration:%'
    UNION ALL
    SELECT created_at, 'market_fee', 0::bigint, fee_coins::bigint
    FROM public.skyblock_market_sales
    WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '180 days'
      AND fee_coins > 0
)
SELECT date_trunc('hour', created_at, 'UTC') AS time,
       source,
       sum(minted_coins)::bigint AS minted_coins,
       sum(burned_coins)::bigint AS burned_coins
FROM actual_flows
GROUP BY 1, 2;

CREATE OR REPLACE VIEW metrics.skyblock_liquidity WITH (security_barrier = true) AS
WITH last_transaction_at AS (
    SELECT island_id, max(created_at) AS created_at,
           count(*) FILTER (WHERE source NOT LIKE 'migration:%')::bigint AS ledger_mutations
    FROM public.skyblock_coin_transactions
    GROUP BY island_id
), latest_balance_distance AS (
    SELECT account.island_id,
           min(abs(account.balance - transaction.balance_after))::bigint AS balance_distance,
           latest.ledger_mutations
    FROM public.skyblock_island_accounts account
    JOIN last_transaction_at latest ON latest.island_id = account.island_id
    JOIN public.skyblock_coin_transactions transaction
      ON transaction.island_id = latest.island_id AND transaction.created_at = latest.created_at
    GROUP BY account.island_id, latest.ledger_mutations
)
SELECT count(*)::bigint AS island_accounts,
       count(*) FILTER (WHERE account.balance = 0)::bigint AS zero_balance_accounts,
       COALESCE(sum(account.balance), 0)::bigint AS total_balance_coins,
       COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY account.balance), 0)::double precision
           AS median_balance_coins,
       COALESCE(percentile_cont(0.9) WITHIN GROUP (ORDER BY account.balance), 0)::double precision
           AS p90_balance_coins,
       COALESCE(max(account.balance), 0)::bigint AS largest_balance_coins,
       count(*) FILTER (WHERE distance.island_id IS NULL)::bigint AS accounts_without_ledger,
       COALESCE(sum(distance.balance_distance), 0)::bigint AS ledger_balance_drift_coins,
       count(*) FILTER (WHERE distance.ledger_mutations <> account.version)::bigint AS ledger_version_drift_accounts,
       (SELECT count(*) FROM public.skyblock_market_listings
          WHERE status = 'active' AND expires_at > CURRENT_TIMESTAMP)::bigint AS active_listings,
       (SELECT count(*) FROM public.skyblock_market_sales
          WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours')::bigint AS market_sales_24h,
       (SELECT COALESCE(sum(price_coins), 0) FROM public.skyblock_market_sales
          WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours')::bigint AS market_volume_coins_24h,
       (SELECT COALESCE(sum(amount), 0) FROM public.skyblock_coin_transactions
          WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours' AND amount > 0
            AND source NOT LIKE 'market:%' AND source NOT LIKE 'migration:%')::bigint AS minted_coins_24h,
       ((SELECT COALESCE(sum(-amount), 0) FROM public.skyblock_coin_transactions
           WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours' AND amount < 0
             AND source NOT LIKE 'market:%' AND source NOT LIKE 'migration:%')
         + (SELECT COALESCE(sum(fee_coins), 0) FROM public.skyblock_market_sales
           WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'))::bigint AS burned_coins_24h,
       (SELECT COALESCE(sum(fee_coins), 0) FROM public.skyblock_market_sales
          WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours')::bigint AS market_fee_coins_24h
FROM public.skyblock_island_accounts account
LEFT JOIN latest_balance_distance distance ON distance.island_id = account.island_id;

CREATE OR REPLACE VIEW metrics.skyblock_invariants WITH (security_barrier = true) AS
WITH listing_reservations AS (
    SELECT storage_item_id, sum(quantity)::bigint AS quantity
    FROM public.skyblock_market_listings
    WHERE status = 'active'
    GROUP BY storage_item_id
), stored AS (
    SELECT island_id, sum(quantity)::bigint AS quantity
    FROM public.skyblock_storage_items
    GROUP BY island_id
), inbound AS (
    SELECT island_id, sum(quantity)::bigint AS quantity
    FROM public.skyblock_inventory_transfers
    WHERE direction = 'deposit' AND state IN ('prepared', 'marked')
    GROUP BY island_id
)
SELECT (SELECT count(*) FROM public.skyblock_storage_items
         WHERE quantity < 0)::bigint AS negative_storage_rows,
       (SELECT count(*) FROM public.skyblock_storage_items
         WHERE reserved_quantity < 0 OR reserved_quantity > quantity)::bigint AS invalid_storage_reservations,
       (SELECT count(*) FROM public.skyblock_storage_items item
          LEFT JOIN listing_reservations listing ON listing.storage_item_id = item.id
         WHERE item.reserved_quantity <> COALESCE(listing.quantity, 0))::bigint AS listing_reservation_mismatches,
       (SELECT count(*) FROM public.skyblock_islands island
          LEFT JOIN stored ON stored.island_id = island.id
          LEFT JOIN inbound ON inbound.island_id = island.id
         WHERE COALESCE(stored.quantity, 0) + COALESCE(inbound.quantity, 0) > island.storage_capacity)::bigint
           AS storage_capacity_violations,
       (SELECT count(*) FROM public.skyblock_market_listings
         WHERE status = 'active' AND expires_at <= CURRENT_TIMESTAMP)::bigint AS expired_active_listings,
       (SELECT count(*) FROM public.skyblock_sessions
         WHERE ended_at IS NULL AND started_at < CURRENT_TIMESTAMP - INTERVAL '12 hours')::bigint AS orphan_sessions,
       (SELECT ledger_balance_drift_coins FROM metrics.skyblock_liquidity)::bigint AS ledger_balance_drift_coins,
       (SELECT ledger_version_drift_accounts FROM metrics.skyblock_liquidity)::bigint AS ledger_version_drift_accounts;

GRANT USAGE ON SCHEMA metrics TO cookiebuild_metrics;
GRANT SELECT ON metrics.usage_hourly, metrics.matches_hourly, metrics.usage_summary,
    metrics.skyblock_sessions_daily, metrics.skyblock_session_summary,
    metrics.skyblock_retention_cohorts, metrics.skyblock_retention_summary,
    metrics.skyblock_economy_hourly, metrics.skyblock_liquidity, metrics.skyblock_invariants
TO cookiebuild_metrics;

-- Cross-mode engagement views retain the previously deployed activity ledger
-- while the V2 views above provide the stricter economy and recovery model.
CREATE OR REPLACE VIEW metrics.mode_usage_daily WITH (security_barrier = true) AS
WITH activity AS (
  SELECT match.id AS activity_id,
         player.player_id,
         match.gametype AS mode,
         match.starttime AT TIME ZONE 'UTC' AS started_at,
         match.endtime AT TIME ZONE 'UTC' AS ended_at,
         true AS completed_match
  FROM public.matches match
  JOIN public.match_players player ON player.match_id = match.id
  WHERE match.endtime IS NOT NULL
    AND match.endtime >= match.starttime
    AND match.starttime >= (CURRENT_TIMESTAMP - INTERVAL '180 days') AT TIME ZONE 'UTC'
  UNION ALL
  SELECT session.id,
         session.player_id,
         'Skyblock'::text,
         session.started_at,
         COALESCE(session.ended_at, session.last_seen_at),
         false
  FROM public.skyblock_activity_sessions session
  WHERE session.started_at >= CURRENT_TIMESTAMP - INTERVAL '180 days'
    AND COALESCE(session.ended_at, session.last_seen_at) >= session.started_at
), segments AS (
  SELECT activity.*,
         day.day::date AS local_day,
         GREATEST(activity.started_at, day.day::date::timestamp AT TIME ZONE 'Europe/Paris') AS segment_start,
         LEAST(activity.ended_at, (day.day::date + 1)::timestamp AT TIME ZONE 'Europe/Paris') AS segment_end
  FROM activity
  CROSS JOIN LATERAL generate_series(
    (activity.started_at AT TIME ZONE 'Europe/Paris')::date,
    (activity.ended_at AT TIME ZONE 'Europe/Paris')::date,
    INTERVAL '1 day'
  ) AS day(day)
)
SELECT local_day::timestamp AT TIME ZONE 'Europe/Paris' AS time,
       mode,
       count(DISTINCT player_id)::bigint AS active_players,
       count(DISTINCT (activity_id, player_id))::bigint AS visits,
       sum(EXTRACT(EPOCH FROM (segment_end - segment_start))) / 60.0 AS player_minutes,
       count(DISTINCT activity_id) FILTER (WHERE completed_match)::bigint AS completed_matches
FROM segments
WHERE segment_end >= segment_start
GROUP BY local_day, mode;

CREATE OR REPLACE VIEW metrics.mode_engagement_summary WITH (security_barrier = true) AS
WITH activity AS (
  SELECT match.id AS activity_id,
         player.player_id,
         match.gametype AS mode,
         match.starttime AT TIME ZONE 'UTC' AS started_at,
         match.endtime AT TIME ZONE 'UTC' AS ended_at,
         false AS server_crash
  FROM public.matches match
  JOIN public.match_players player ON player.match_id = match.id
  WHERE match.endtime IS NOT NULL
    AND match.endtime >= match.starttime
    AND match.starttime >= (CURRENT_TIMESTAMP - INTERVAL '180 days') AT TIME ZONE 'UTC'
  UNION ALL
  SELECT session.id,
         session.player_id,
         'Skyblock'::text,
         session.started_at,
         COALESCE(session.ended_at, session.last_seen_at),
         session.server_crash
  FROM public.skyblock_activity_sessions session
  WHERE session.started_at >= CURRENT_TIMESTAMP - INTERVAL '180 days'
    AND COALESCE(session.ended_at, session.last_seen_at) >= session.started_at
), window_metrics AS (
  SELECT mode,
         count(DISTINCT player_id) FILTER (
           WHERE ended_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
             AND started_at <= CURRENT_TIMESTAMP
         )::bigint AS active_1d,
         count(DISTINCT player_id) FILTER (
           WHERE ended_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
             AND started_at <= CURRENT_TIMESTAMP
         )::bigint AS active_7d,
         count(DISTINCT player_id) FILTER (
           WHERE ended_at >= CURRENT_TIMESTAMP - INTERVAL '28 days'
             AND started_at <= CURRENT_TIMESTAMP
         )::bigint AS active_28d,
         count(*) FILTER (WHERE started_at >= CURRENT_TIMESTAMP - INTERVAL '28 days')::bigint AS visits_28d,
         sum(EXTRACT(EPOCH FROM (
           LEAST(ended_at, CURRENT_TIMESTAMP) - GREATEST(started_at, CURRENT_TIMESTAMP - INTERVAL '7 days')
         ))) FILTER (
           WHERE ended_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
             AND started_at <= CURRENT_TIMESTAMP
         ) / 60.0 AS player_minutes_7d,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ended_at - started_at)) / 60.0)
           FILTER (WHERE started_at >= CURRENT_TIMESTAMP - INTERVAL '7 days') AS duration_p50_minutes_7d,
         percentile_cont(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ended_at - started_at)) / 60.0)
           FILTER (WHERE started_at >= CURRENT_TIMESTAMP - INTERVAL '7 days') AS duration_p90_minutes_7d,
         count(*) FILTER (
           WHERE server_crash AND started_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
         )::bigint AS recovered_crash_sessions_7d,
         min(started_at) AS coverage_started_at
  FROM activity
  GROUP BY mode
), player_frequency AS (
  SELECT mode,
         player_id,
         count(*)::bigint AS visits,
         count(DISTINCT (started_at AT TIME ZONE 'Europe/Paris')::date)::bigint AS active_days
  FROM activity
  WHERE started_at >= CURRENT_TIMESTAMP - INTERVAL '28 days'
  GROUP BY mode, player_id
), frequency_metrics AS (
  SELECT mode,
         count(*)::bigint AS measured_players,
         count(*) FILTER (WHERE active_days >= 2)::bigint AS returning_players_28d,
         avg(active_days::numeric) AS active_days_per_player_28d,
         avg(visits::numeric) AS visits_per_player_28d
  FROM player_frequency
  GROUP BY mode
)
SELECT summary.mode,
       summary.active_1d,
       summary.active_7d,
       summary.active_28d,
       summary.visits_28d,
       summary.player_minutes_7d,
       summary.duration_p50_minutes_7d,
       summary.duration_p90_minutes_7d,
       frequency.returning_players_28d,
       CASE WHEN frequency.measured_players > 0
         THEN frequency.returning_players_28d::numeric / frequency.measured_players
         ELSE NULL END AS repeat_rate_28d,
       frequency.active_days_per_player_28d,
       frequency.visits_per_player_28d,
       CASE WHEN summary.active_28d > 0 THEN summary.active_7d::numeric / summary.active_28d ELSE NULL END AS wau_mau_proxy,
       summary.recovered_crash_sessions_7d,
       summary.coverage_started_at
FROM window_metrics summary
JOIN frequency_metrics frequency USING (mode);

CREATE OR REPLACE VIEW metrics.mode_retention_cohorts WITH (security_barrier = true) AS
WITH activity_days AS (
  SELECT DISTINCT player.player_id,
         match.gametype AS mode,
         (match.starttime AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Paris')::date AS activity_day
  FROM public.matches match
  JOIN public.match_players player ON player.match_id = match.id
  WHERE match.endtime IS NOT NULL
    AND match.endtime >= match.starttime
  UNION
  SELECT DISTINCT session.player_id,
         'Skyblock'::text,
         (session.started_at AT TIME ZONE 'Europe/Paris')::date
  FROM public.skyblock_activity_sessions session
), cohorts AS (
  SELECT player_id, mode, min(activity_day) AS cohort_day
  FROM activity_days
  GROUP BY player_id, mode
), recent_cohorts AS (
  SELECT *
  FROM cohorts
  WHERE cohort_day >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Paris')::date - 90
)
SELECT cohort.cohort_day::timestamp AT TIME ZONE 'Europe/Paris' AS time,
       cohort.mode,
       count(*)::bigint AS cohort_size,
       count(*) FILTER (
         WHERE cohort.cohort_day <= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Paris')::date - 1
       )::bigint AS d1_eligible,
       count(*) FILTER (
         WHERE EXISTS (
           SELECT 1 FROM activity_days activity
           WHERE activity.player_id = cohort.player_id
             AND activity.mode = cohort.mode
             AND activity.activity_day = cohort.cohort_day + 1
         )
       )::bigint AS d1_retained,
       CASE WHEN cohort.cohort_day <= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Paris')::date - 1
         THEN count(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM activity_days activity
           WHERE activity.player_id = cohort.player_id
             AND activity.mode = cohort.mode
             AND activity.activity_day = cohort.cohort_day + 1
         ))::numeric / count(*) ELSE NULL END AS d1_rate,
       count(*) FILTER (
         WHERE cohort.cohort_day <= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Paris')::date - 7
       )::bigint AS d7_eligible,
       count(*) FILTER (
         WHERE EXISTS (
           SELECT 1 FROM activity_days activity
           WHERE activity.player_id = cohort.player_id
             AND activity.mode = cohort.mode
             AND activity.activity_day = cohort.cohort_day + 7
         )
       )::bigint AS d7_retained,
       CASE WHEN cohort.cohort_day <= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Paris')::date - 7
         THEN count(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM activity_days activity
           WHERE activity.player_id = cohort.player_id
             AND activity.mode = cohort.mode
             AND activity.activity_day = cohort.cohort_day + 7
         ))::numeric / count(*) ELSE NULL END AS d7_rate,
       count(*) FILTER (
         WHERE cohort.cohort_day <= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Paris')::date - 30
       )::bigint AS d30_eligible,
       count(*) FILTER (
         WHERE EXISTS (
           SELECT 1 FROM activity_days activity
           WHERE activity.player_id = cohort.player_id
             AND activity.mode = cohort.mode
             AND activity.activity_day = cohort.cohort_day + 30
         )
       )::bigint AS d30_retained,
       CASE WHEN cohort.cohort_day <= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Paris')::date - 30
         THEN count(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM activity_days activity
           WHERE activity.player_id = cohort.player_id
             AND activity.mode = cohort.mode
             AND activity.activity_day = cohort.cohort_day + 30
         ))::numeric / count(*) ELSE NULL END AS d30_rate
FROM recent_cohorts cohort
GROUP BY cohort.cohort_day, cohort.mode;

CREATE OR REPLACE VIEW metrics.skyblock_market_daily WITH (security_barrier = true) AS
WITH events AS (
  SELECT (listing.created_at AT TIME ZONE 'Europe/Paris')::date AS local_day,
         1::bigint AS listings_created,
         0::bigint AS listings_cancelled,
         0::bigint AS listings_expired,
         0::bigint AS deals,
         0::bigint AS units_sold,
         0::bigint AS gross_coins,
         0::bigint AS fees_coins,
         NULL::uuid AS buyer_player_id,
         NULL::uuid AS seller_player_id,
         NULL::numeric AS sale_delay_minutes
  FROM public.skyblock_market_listings listing
  UNION ALL
  SELECT (listing.resolved_at AT TIME ZONE 'Europe/Paris')::date,
         0,
         CASE WHEN listing.status = 'cancelled' THEN 1 ELSE 0 END,
         CASE WHEN listing.status = 'expired' THEN 1 ELSE 0 END,
         0, 0, 0, 0, NULL, NULL, NULL
  FROM public.skyblock_market_listings listing
  WHERE listing.resolved_at IS NOT NULL
    AND listing.status IN ('cancelled', 'expired')
  UNION ALL
  SELECT (sale.created_at AT TIME ZONE 'Europe/Paris')::date,
         0, 0, 0, 1,
         sale.quantity,
         sale.price_coins,
         sale.fee_coins,
         sale.buyer_player_id,
         sale.seller_player_id,
         EXTRACT(EPOCH FROM (sale.created_at - listing.created_at)) / 60.0
  FROM public.skyblock_market_sales sale
  JOIN public.skyblock_market_listings listing ON listing.id = sale.listing_id
)
SELECT local_day::timestamp AT TIME ZONE 'Europe/Paris' AS time,
       sum(listings_created)::bigint AS listings_created,
       sum(listings_cancelled)::bigint AS listings_cancelled,
       sum(listings_expired)::bigint AS listings_expired,
       sum(deals)::bigint AS deals,
       sum(units_sold)::bigint AS units_sold,
       sum(gross_coins)::bigint AS gross_coins,
       sum(fees_coins)::bigint AS fees_coins,
       count(DISTINCT buyer_player_id)::bigint AS buyers,
       count(DISTINCT seller_player_id)::bigint AS sellers,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY sale_delay_minutes)
         FILTER (WHERE sale_delay_minutes IS NOT NULL) AS sale_delay_p50_minutes
FROM events
GROUP BY local_day;

CREATE OR REPLACE VIEW metrics.skyblock_progress_daily WITH (security_barrier = true) AS
WITH events AS (
  SELECT (island.created_at AT TIME ZONE 'Europe/Paris')::date AS local_day,
         1::bigint AS islands_created, 0::bigint AS coop_members_joined,
         0::bigint AS quests_completed, 0::bigint AS quests_claimed
  FROM public.skyblock_islands island
  UNION ALL
  SELECT (member.joined_at AT TIME ZONE 'Europe/Paris')::date,
         0, 1, 0, 0
  FROM public.skyblock_island_members member
  WHERE member.role <> 'owner'
  UNION ALL
  SELECT (quest.completed_at AT TIME ZONE 'Europe/Paris')::date,
         0, 0, 1, 0
  FROM public.skyblock_quest_progress quest
  WHERE quest.completed_at IS NOT NULL
  UNION ALL
  SELECT (quest.claimed_at AT TIME ZONE 'Europe/Paris')::date,
         0, 0, 0, 1
  FROM public.skyblock_quest_progress quest
  WHERE quest.claimed_at IS NOT NULL
)
SELECT local_day::timestamp AT TIME ZONE 'Europe/Paris' AS time,
       sum(islands_created)::bigint AS islands_created,
       sum(coop_members_joined)::bigint AS coop_members_joined,
       sum(quests_completed)::bigint AS quests_completed,
       sum(quests_claimed)::bigint AS quests_claimed
FROM events
GROUP BY local_day;

CREATE OR REPLACE VIEW metrics.skyblock_economy_daily WITH (security_barrier = true) AS
SELECT economy.metric_date::timestamp AT TIME ZONE 'Europe/Paris' AS time,
       sum(economy.generator_items_broken)::bigint AS generator_items_broken,
       sum(economy.storage_items_deposited)::bigint AS storage_items_deposited,
       sum(economy.worker_items_collected)::bigint AS worker_items_collected,
       sum(economy.npc_items_sold)::bigint AS npc_items_sold,
       sum(economy.npc_sale_coins)::bigint AS npc_sale_coins,
       sum(economy.generator_upgrades)::bigint AS generator_upgrades,
       CASE WHEN sum(economy.generator_upgrades) > 0 THEN
         sum(economy.generator_upgrade_seconds_total)::numeric
           / sum(economy.generator_upgrades) / 60.0
       END AS average_upgrade_minutes,
       CASE WHEN sum(economy.storage_saturation_samples) > 0 THEN
         sum(economy.storage_saturation_basis_points_total)::numeric
           / sum(economy.storage_saturation_samples) / 100.0
       END AS average_storage_percent,
       CASE WHEN sum(economy.storage_saturation_samples) > 0 THEN
         sum(economy.storage_full_samples)::numeric * 100.0
           / sum(economy.storage_saturation_samples)
       END AS storage_full_percent
FROM public.skyblock_economy_daily economy
GROUP BY economy.metric_date;

GRANT USAGE ON SCHEMA metrics TO cookiebuild_metrics;
GRANT SELECT ON metrics.usage_hourly, metrics.matches_hourly, metrics.usage_summary,
    metrics.mode_usage_daily, metrics.mode_engagement_summary, metrics.mode_retention_cohorts,
    metrics.skyblock_market_daily, metrics.skyblock_progress_daily,
    metrics.skyblock_economy_daily TO cookiebuild_metrics;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM cookiebuild_metrics;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM cookiebuild_metrics;
REVOKE ALL ON SCHEMA public FROM cookiebuild_metrics;
