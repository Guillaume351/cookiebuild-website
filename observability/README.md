# Cookie Build observability

This stack is deployed as a separate Dokploy Swarm compose so dashboard or
collector upgrades never restart Minecraft. It contains Prometheus, Grafana
OSS, Alertmanager, Loki, Alloy, node-exporter, cAdvisor, and postgres_exporter.

Only Grafana is routed publicly. Prometheus, Alertmanager, Loki, exporters, and
raw Minecraft logs stay on the private Cookie Build overlay network. Grafana is
an anonymous read-only dashboard; its PostgreSQL role can read aggregate views
in the `metrics` schema only and cannot read player rows, names, UUIDs, or Loki.

Secrets are generated on the production host and mounted read-only from
`/home/ubuntu/Volumes/cookiebuild/observability/secrets`. They must never be
committed or copied into Dokploy output.

The website's aggregate mobile and Skyblock funnel endpoint is private:
`GET /api/internal/metrics` requires `Authorization: Bearer <COOKIEBUILD_METRICS_TOKEN>` with a
secret of at least 32 characters. Configure the Prometheus scrape target only on the private
service network and source the token from a mounted secret or protected runtime configuration.
The endpoint exposes only the bounded event/result/source labels declared in
`contracts/product-events-v1.json`; never add names, UUIDs, addresses, or free-form paths.

Retention is 30 days / 10 GB for Prometheus and 14 days for Loki.

The provisioned game-mode dashboard uses aggregate PostgreSQL views for DAU,
player time, repeat usage and mature D1/D7/D30 cohorts. Competitive player time
is match duration multiplied by recorded participants, so an early disconnect
can be over-counted. Skyblock uses its checkpointed activity-session ledger and
starts accumulating duration/retention history only after that ledger is
deployed; it cannot be reconstructed from `last_active_at`.

Skyblock marketplace panels aggregate durable listings and sales. Coin volume
is an in-game economy measure, never real-money revenue. Neither dashboard role
nor Prometheus receives player, UUID, island, listing or session labels.
