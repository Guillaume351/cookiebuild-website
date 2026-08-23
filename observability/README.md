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
