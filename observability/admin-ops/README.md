# Admin operations observability examples

Ces fichiers sont des exemples isolés ; ils ne modifient pas le Prometheus/Grafana de production.

- fusionner `prometheus-scrape.example.yml` dans `scrape_configs` en remplaçant la cible par le nom DNS privé réellement déployé ;
- charger `alerts.example.yml` via `rule_files`, valider avec `promtool check rules`, puis router `severity=info|warning` dans l’Alertmanager existant ;
- importer `grafana-dashboard.json` et sélectionner la datasource Prometheus lors de l’import.

Le port `/metrics` du moniteur ne contient ni URL amont, ni version en label. `/healthz` et `/metrics` doivent rester accessibles uniquement sur le réseau de supervision. Les routes de statut, rapport, prompt et check demeurent protégées par HMAC.

L’operator n’expose volontairement qu’un `/healthz` minimal non signé. Sa disponibilité détaillée et ses actions restent derrière le BFF ; si une sonde externe est requise, utiliser le blackbox exporter contre sa cible privée sans exposer la route publiquement.
