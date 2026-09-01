# Cookie Build admin control center

This document defines the trust boundaries and runtime contracts for the Cookie Build admin
control center. The browser is never allowed to contact Minecraft, RabbitMQ, Prometheus, Loki,
Docker, SSH, or Dokploy directly.

## Components

- `admin.cookie-build.com`: Nuxt UI and backend-for-frontend (BFF).
- PostgreSQL: admin identities, roles, audit, notification campaigns, moderation, commands,
  operation history, update checks, and durable runtime snapshots/events.
- `CookieDough AdminBridge`: publishes runtime snapshots and consumes allow-listed Minecraft
  commands.
- `operator`: private service that runs fixed maintenance and restart runbooks.
- `update-monitor`: private service that checks official Paper and plugin release sources and
  generates a review report plus an AI-ready upgrade prompt. It never installs updates.
- Prometheus and Loki: private read-only telemetry queried only through allow-listed BFF routes.

## Authentication and authorization

Admin identities use Firebase email/password accounts with the `admin=true` custom claim. The BFF
exchanges a recently issued ID token for a short-lived `HttpOnly`, `Secure`, `SameSite=Strict`
session cookie. Public registration is not supported.

The first nominative owner should be created without a password with
`npm run admin:provision -- --create <email> owner <display-name>`. A password-reset email is then
sent directly to that address from the Firebase console, so no operator ever handles or transmits a
temporary password or reset link. Existing Firebase identities can be provisioned by omitting
`--create`.

The current BFF login implements Firebase email/password authentication only. Firebase MFA must
not be enabled for these accounts until the BFF also implements the MFA challenge response; an
external access gate can be used as an additional layer in the meantime.

Every request also resolves an enabled `admin_users` record. The claim is only the coarse gate;
the database role is the source of truth for permissions and immediate revocation.

Roles, from least to most privileged:

1. `viewer`: dashboards, runtime, metrics, sanitized logs, updates, and audit reads.
2. `moderator`: reports, kick, mute, ban, direct messages, and safe match intervention.
3. `editor`: news, changelog, events, broadcasts, and mobile notification campaigns.
4. `operator`: maintenance, drain, restart simulation, restart, operation history, and canaries.
5. `owner`: emergency operations and every backoffice permission.

Mutations require CSRF protection. Permanent bans, emergency match cancellation, maintenance,
and restart require recent authentication and an explicit reason. Admin account and role changes
stay outside the web UI: they require server-side access to the provisioning command, whose
invocation must be retained in the deployment audit log.

## Minecraft command contract

Exchange: `cookiebuild.admin` (durable topic exchange).

- BFF to Paper: `commands.<serverId>`
- Paper to BFF: `events.<serverId>.<kind>`

Command envelope:

```json
{
  "id": "uuid",
  "type": "kick",
  "target_type": "player",
  "target_id": "uuid",
  "payload": {},
  "created_at": "ISO-8601",
  "expires_at": "ISO-8601",
  "idempotency_key": "bounded-string"
}
```

Supported command types are fixed in code. There is no console-command or RCON escape hatch.
RabbitMQ delivery uses publisher confirmation, manual consumer acknowledgement, a bounded TTL,
dead lettering, reconnect backoff, and command idempotency. Bukkit operations are always scheduled
on the Paper main thread.

Runtime snapshots include a server ID, sequence, observed timestamp, maintenance state, players,
and games. Player and game IDs remain data fields rather than Loki/Prometheus labels to avoid high
cardinality and accidental public exposure.

## Operator contract

The operator has no public route. Requests are signed with an HMAC over method, path, timestamp,
nonce, and body hash. The operator rejects stale timestamps and reused nonces.

Only fixed operations are supported:

- status
- simulate restart
- start/cancel maintenance
- restart Minecraft

The operator accepts no shell fragment, service name, path, image, SQL, or arbitrary environment
override from a request. Production commands and the exact target service are process
configuration. One distributed operation lock is held at a time.

The normal restart runbook first enables Paper maintenance through the typed AdminBridge, verifies
`restart_ready`, then requires fresh telemetry, zero active players, healthy PostgreSQL and
RabbitMQ, a reason, and successful Java/Bedrock/website canaries after restart.
Emergency override is owner-only and remains auditable.

Database restoration, free-form SQL, volume deletion, arbitrary Docker operations, SSH, and shell
access are intentionally outside the backoffice.

## Update monitor contract

The update monitor only reports. It never downloads or installs a server or plugin artifact.

Release sources are restricted to PaperMC's official downloads service, GeyserMC's official
download service, and the configured upstream release repositories for ViaVersion,
ViaBackwards, ProtocolLib, and OldCombatMechanics. HTTP responses are cached using validators when
available and requests identify Cookie Build with a non-generic User-Agent.

For every component the report records installed version, latest stable version, release URL,
publication time, release notes excerpt, compatibility warnings, and check status. The generated
AI prompt includes the immutable facts and the Cookie Build validation checklist, but never a
credential, webhook, host secret, or database URL.

Production versions come from a short-lived, secret-free snapshot published periodically by the
running CookieDough plugin. The update monitor sees only that dedicated snapshot directory, never
the Paper plugin directory, Floodgate key, or plugin configuration. A missing, stale, invalid, or
incomplete snapshot fails closed as `installed-unknown` instead of reusing a declared value.

## Audit and privacy

Audit events are append-only and contain actor, action, target, request ID, reason, sanitized
metadata, result, and timestamp. Successful authentication and every accepted mutation are
recorded without tokens or passwords; failed login attempts are rate-limited and should also be
retained by the production ingress security log.

FCM tokens, Firebase UIDs, session cookies, authorization headers, database URLs, webhook URLs,
private keys, IP addresses, and raw secrets are never returned by admin APIs. Loki queries are
predefined and bounded by time and line count, with a redaction pass before returning data.
