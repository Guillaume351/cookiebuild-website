\set ON_ERROR_STOP on

SELECT format('CREATE ROLE cookiebuild_metrics LOGIN PASSWORD %L', :'grafana_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cookiebuild_metrics') \gexec
SELECT format('ALTER ROLE cookiebuild_metrics PASSWORD %L', :'grafana_password') \gexec
ALTER ROLE cookiebuild_metrics SET default_transaction_read_only = on;
ALTER ROLE cookiebuild_metrics SET search_path = metrics, pg_catalog;

SELECT format('CREATE ROLE cookiebuild_exporter LOGIN PASSWORD %L', :'exporter_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cookiebuild_exporter') \gexec
SELECT format('ALTER ROLE cookiebuild_exporter PASSWORD %L', :'exporter_password') \gexec
GRANT pg_monitor TO cookiebuild_exporter;
GRANT CONNECT ON DATABASE cookiebuild_prod TO cookiebuild_exporter;

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

GRANT USAGE ON SCHEMA metrics TO cookiebuild_metrics;
GRANT SELECT ON metrics.usage_hourly, metrics.matches_hourly, metrics.usage_summary TO cookiebuild_metrics;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM cookiebuild_metrics;
