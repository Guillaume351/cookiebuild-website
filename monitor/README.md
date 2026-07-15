# Cookie Build production monitor

This is a dependency-free, out-of-process incident monitor for Cookie Build. It
is intentionally smaller than a Grafana/Prometheus/Sentry stack and covers the
failures that need an operator response:

- Java server-list protocol availability and latency;
- Bedrock RakNet availability and latency;
- website availability and expected page content;
- a real `SELECT 1` database query through `/api/health` (not just a TCP port);
- new Paper, CookieDough, MicroBattles, Pitchout, SkyWars and BuildBattles fatal log lines.

It sends a Discord alert only after three consecutive failed checks (three
minutes by default), sends one reminder every six hours while an outage remains,
and sends one recovery message. Fatal log signatures are deduplicated for six
hours. State persists in `/state/monitor.json`, so a monitor restart does not
repeat an incident.

The monitor also exposes `GET /healthz` and Prometheus-format `GET /metrics` on
port 8080. Do not publish that port to the internet; Dokploy or a future
Prometheus instance can reach it on the internal network.

## Test and build

From the website repository root:

```sh
cd monitor && npm test
docker build -f monitor/Dockerfile -t cookiebuild-monitor:1 .
```

## Production deployment

Create a small Dokploy application from the same website Git repository, using:

- branch: `main`;
- build type: Dockerfile;
- Dockerfile: `/monitor/Dockerfile`;
- Docker context: `/`;
- no public domain or published port;
- one persistent volume mounted at `/state`;
- the Paper log directory mounted read-only at `/minecraft-logs`.

The supplied `docker-compose.example.yml` is an equivalent sidecar definition.
Install a monitor-readable copy of the already configured observability webhook
under `/home/ubuntu/Volumes/cookiebuild/monitor_secrets/discord_alert_webhook`
(owned by the container user, UID/GID 1000, mode `0400`) and expose its path as
`DISCORD_ALERT_WEBHOOK_FILE`; no new account, webhook, database credential,
Grafana instance, or user setup is required. Keep the source observability secret
root-only. `DISCORD_ALERT_WEBHOOK_URL` is also supported for platforms that cannot
mount a secret file. The monitor deliberately does not fall back to
`DISCORD_PLAYER_STATUS_WEBHOOK_URL`, because that endpoint is the player
join/leave log channel.

The minimum environment is:

```dotenv
MINECRAFT_HOST=play.cookie-build.com
MINECRAFT_JAVA_PORT=25565
MINECRAFT_BEDROCK_PORT=19132
WEBSITE_URL=https://www.cookie-build.com
DISCORD_ALERT_WEBHOOK_FILE=/run/secrets/discord_alert_webhook
```

Mount the secret read-only at the path above. Defaults are already correct for
every value except the webhook. Optional
settings are `MONITOR_INTERVAL_SECONDS`, `MONITOR_FAILURE_THRESHOLD`,
`MONITOR_REMINDER_HOURS`, `MONITOR_STARTUP_GRACE_SECONDS`,
`DISCORD_ALERT_MENTION`, `MINECRAFT_LOG_FILE`, and `PORT`.

When the monitor is added to the existing Minecraft compose, set
`MINECRAFT_HOST=minecraft` to use the internal service name. A separate Dokploy
application should keep the public hostname shown above.

During planned maintenance, create `/state/maintenance`; delete it when the
deployment is healthy. Checks and state continue, but messages are suppressed.
The two-minute startup grace also prevents alerts during an ordinary restart.

## Limits

Network probes prove that clients can discover the server, not that an
authenticated player can complete a match. Log scanning catches map-load,
plugin and server-thread failures after they are logged, but cannot visually
detect a structurally empty map or stacked NPCs. Keep the authenticated
Java/Bedrock release canary for those cases. The database check depends on the
website API and may take roughly three to five minutes to alert after an outage
because of the consecutive-failure threshold.
