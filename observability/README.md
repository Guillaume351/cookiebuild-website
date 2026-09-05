# Cookie Build observability

This stack is deployed as a separate Dokploy Swarm compose so dashboard or
collector upgrades never restart Minecraft. It contains Prometheus, Grafana
OSS, Alertmanager, Loki, Alloy, node-exporter, cAdvisor, and
`postgres_exporter` plus `sql_exporter` 0.24.4. Postgres Exporter retains the
standard PostgreSQL runtime metrics only; SQL Exporter replaces its deprecated
custom-query path for Skyblock and only reads aggregate `metrics.*` views.

Only Grafana is routed publicly. Prometheus, Alertmanager, Loki, exporters, and
raw Minecraft logs stay on the private Cookie Build overlay network. Grafana is
an anonymous read-only dashboard; its PostgreSQL role can read aggregate views
in the `metrics` schema only and cannot read player rows, names, UUIDs, or Loki.
SQL Exporter reuses the `cookiebuild_metrics` aggregate-only boundary: it has no
`public` schema access, is read-only, and has an eight-second statement timeout.
The separate `cookiebuild_exporter` role keeps `pg_monitor` solely for standard
Postgres Exporter metrics and is never used by a Skyblock collector.

Secrets are generated on the production host and mounted read-only from
`/home/ubuntu/Volumes/cookiebuild/observability/secrets`. They must never be
committed or copied into Dokploy output.

`sql_exporter_dsn` is a mounted file containing the complete PostgreSQL DSN for
`cookiebuild_metrics`. The password component must be URL-escaped. The
container exits before starting the exporter when this file is absent or empty;
the placeholder DSN in `sql_exporter.yml` is always overridden at runtime.
The service runs explicitly as UID/GID `65534:65534`; provision the host file as
`root:65534` with mode `0440`. The read-only bind mount preserves that numeric
group mapping, so the exporter can read the secret without making it
world-readable.
Continue to provision `grafana_db_password`, `grafana_admin_password`, and
`postgres_exporter_password` and `discord_webhook` as separate mounted files.
No example file should contain a usable credential.

The website's aggregate mobile and Skyblock funnel endpoint is private:
`GET /api/internal/metrics` requires `Authorization: Bearer <COOKIEBUILD_METRICS_TOKEN>` with a
secret of at least 32 characters. Configure the Prometheus scrape target only on the private
service network and source the token from a mounted secret or protected runtime configuration.
The endpoint exposes only the bounded event/result/source labels declared in
`contracts/product-events-v1.json`; never add names, UUIDs, addresses, or free-form paths.

Retention is 30 days / 10 GB for Prometheus and 14 days for Loki.

## Skyblock aggregates

Apply `postgres/bootstrap.sql` with the existing secure deployment mechanism,
passing `grafana_password` and `exporter_password` as `psql` variables. It is
idempotent and exposes only these identity-free `security_barrier` views:

- `skyblock_sessions_daily` and `skyblock_session_summary`: completed play time,
  sessions and distinct active players. An open session older than 12 hours is
  considered orphaned; it never contributes unbounded play time.
- `skyblock_retention_cohorts` and `skyblock_retention_summary`: exact UTC
  calendar-day D1, D7 and D30 retention. Immature cohorts have no rate.
- `skyblock_economy_hourly`: real faucets and sinks over a bounded 180-day
  window. `market:buy` and `market:sell` are transfers and are excluded; market
  fees are included once as destruction. Migration opening entries are excluded
  because their creation time is historical rather than the migration timestamp.
- `skyblock_liquidity`: aggregate bank distribution, market volume and ledger
  reconciliation. Accounts without a ledger are reported separately because a
  legitimate migration opening balance can predate ledger entries.
- `skyblock_invariants`: storage quantities/reservations/capacity, expired active
  listings, orphan sessions and monetary ledger drift.

Grafana provisions `Cookie Build · Skyblock Retention and Economy` from
`grafana/dashboards/skyblock.json`. It contains no player-level drill-down.

## Database load and alert bounds

Prometheus scrapes SQL Exporter once per minute. SQL Exporter caches overview
queries for five minutes and retention queries for fifteen minutes, uses one
database connection, staggers warmup, and cancels queries after eight seconds.
Do not reduce these `min_interval` values without a measured database-load
review.

Prometheus alerts when:

- any storage invariant remains non-zero for 10 minutes;
- an expired listing remains active for 15 minutes;
- an open session exceeds the 12-hour safety bound for 15 minutes;
- an account balance/version differs from its ledger for 10 minutes.

## Static validation

From `cookiebuild-website`, run:

```sh
npx vitest run test/observability-skyblock.test.ts
docker compose -f observability/docker-compose.yml config --quiet
```

The focused test parses every changed YAML/JSON artifact and verifies the SQL
security boundary, exporter load limits, scrape target and required alerts. A
successful static check does not replace applying the bootstrap to a staging
copy of production and verifying `/metrics` plus the provisioned dashboard.

## Cross-mode engagement

The provisioned game-mode dashboard uses aggregate PostgreSQL views for DAU,
player time, repeat usage and mature D1/D7/D30 cohorts. Competitive player time
is match duration multiplied by recorded participants, so an early disconnect
can be over-counted. Skyblock uses its checkpointed activity-session ledger and
starts accumulating duration/retention history only after that ledger is
deployed; it cannot be reconstructed from `last_active_at`.

Skyblock marketplace panels aggregate durable listings and sales. Coin volume
is an in-game economy measure, never real-money revenue. Neither dashboard role
nor Prometheus receives player, UUID, island, listing or session labels.

## Shop activation

Migration `drizzle/0019_shop_activation_metrics.sql` adds an internal
`cosmetic_first_activations` ledger and eight aggregate `metrics.shop_*` views.
Apply it in one transaction after migration 0018, with `lock_timeout` set by the
deployment runner. It briefly locks `cosmetic_selections` while taking the
baseline and installing the trigger; it does not require a Minecraft restart.
The migration can be replayed without duplicating or reclassifying observations.
Do not replay the historical observability bootstrap just to install shop views:
it also handles credentials and unrelated views.

An account/cosmetic pair is recorded once, regardless of selection changes,
retries, deselection/reselection, or whether the write came from Java, Bedrock
or the website. Existing selections are labeled `baseline` and timestamped at
the initial observation. Their original acquisition time is unknown. Subsequent
first observations use `selection`; this is an observed state transition, not
proof the effect ran or a marketing acquisition. Account deletion cascades into
the ledger, so these totals are not an immutable accounting record.

Edition is captured at observation from a persisted server link challenge or
active mobile link, falling back to Floodgate's documented zero-prefix UUID
format for Bedrock, an authenticated Java UUID v4, or `unknown` otherwise. It
describes the Minecraft account, not the web browser or device. Linked Bedrock
accounts can have Java UUIDs, so persisted server evidence takes precedence.
The aggregate current-equipment view uses that recorded edition snapshot.

`grafana/dashboards/shop.json` provisions UID `cookiebuild-shop` using the existing
`cookiebuild-postgres` datasource. Copy it atomically into the existing dashboard
bind mount; the provider loads it within 30 seconds. The dashboard refreshes
every five minutes. No new exporter, scrape job or service restart is needed.
The actual production stack may omit the separately prepared SQL Exporter and
Skyblock dashboard; do not replace its whole compose/config directory to add
this dashboard.

Current stock panels explicitly ignore the time picker. Daily charts select
whole Europe/Paris calendar days touched by the picker, within a 180-day bound;
PostgreSQL stores observation and commerce times as `timestamptz`. The free
activation summary counts distinct accounts for that one cosmetic; totals
across different cosmetics are account/cosmetic pairs and must not be called
unique players. Paid current selections require an unexpired, non-revoked
entitlement. Free sparkle selections do not require a paid grant.

Checkout charts count unique live order rows, not request attempts. Paid orders
are first-payment cohorts, while receipts include renewal payments. Refunds
adjust the original payment day's receipts using their current cumulative
amount; this is TTC before fees, not refund-date cash flow or accounting
revenue. Guest gifts do not change these order/payment counts: payer and
recipient identifiers are never projected by the views. Subscriptions show
current billing state, which is not proof of entitlement access.

The ledger, helper functions and source tables are not readable by the Grafana
role. Only security-barrier aggregate views receive `SELECT`. Anonymous GA
traffic is a separate, consent-dependent population; do not divide these server
counts by GA visitors and label the result a measured conversion funnel.

Validate with `npx vitest run test/shop-observability.test.ts
test/shop-observability.integration.test.ts`, setting
`COMMERCE_INTEGRATION_DATABASE_URL` to an isolated local test database for the
integration suite. It creates and removes unique schemas and a non-login role;
it never runs against production.
