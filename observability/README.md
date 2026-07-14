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

Retention is 30 days / 10 GB for Prometheus and 14 days for Loki.
