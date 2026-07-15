# Cookie Build mobile API v1

The mobile API is served below `/api/mobile/v1`. Public reads use short HTTP cache windows. Private
routes require `Authorization: Bearer <Firebase ID token>` and verify token revocation with Firebase
Admin before touching account data.

## Public routes

- `GET /bootstrap`: addresses, supported games, feature flags, support, privacy, terms, and
  account-deletion URLs.
- `GET /status`: Java and Bedrock status, player counts, versions, and MOTDs.
- `GET /leaderboards`: the existing stats query with `gamemode`, `period`, `search`, `page`, and
  `pageSize` filters.
- `GET /events` and `GET /news`: currently published content from PostgreSQL.

## Authenticated routes

- `GET /me`: app identity and active Java/Bedrock player links.
- `POST /player-link/claim` with `{ "code": "AB23CD45" }`.
- `DELETE /player-link`, optionally filtered with `playerId` and/or `edition` query parameters.
- `POST /devices` and `DELETE /devices/:installationId` for FCM token lifecycle.
- `GET|PUT /notification-preferences`.
- `GET /players/lookup?name=<exact name>` returns a case-insensitive exact player-name match without
  presence or wildcard search.
- `GET /friends`, `POST /friend-requests`, `POST /friend-requests/:playerId/accept`, and
  `DELETE /friend-requests/:playerId|/friends/:playerId` manage structured friendships. Presence is
  returned only for accepted friends and is derived from open `player_sessions` rows.
- `GET /blocks`, `PUT|DELETE /blocks/:playerId`, and `POST /reports` provide safety controls.
  Reports accept only documented enum reasons and never accept free text.
- `GET|POST|DELETE /party`, `POST /party/invites`,
  `POST /party/invites/:inviteId/accept`, `DELETE /party/invites/:inviteId`, and
  `DELETE /party/members/:playerId` manage durable four-player parties and expiring invitations.
- `DELETE /account`: anonymizes mobile profile data, revokes player links, removes notification
  devices, and deletes the Firebase Auth user. A failed Firebase deletion remains in the outbox for
  operator retry while the local account stays disabled.

## Minecraft player linking contract

CookieDough owns link-code creation. It generates exactly eight characters from
`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, expires the challenge after ten minutes, and stores only:

```text
lowercase hex(HMAC-SHA256(
  key = UTF-8 MOBILE_LINK_PEPPER,
  message = UTF-8 uppercase code
))
```

The app sends the plaintext code over HTTPS once. The API normalizes trim/uppercase, applies the same
HMAC, identifies the candidate challenge, then follows CookieDough's `playerdata` → challenge lock
order and re-reads the challenge under `FOR UPDATE`. It creates or reactivates the link and marks the
challenge consumed in the same database transaction. Both services must receive the same secret
through Dokploy; it must never be committed or sent to clients.

## Release order

1. Apply `drizzle/0001_mobile_foundation.sql`, `drizzle/0002_mobile_social.sql`,
   `drizzle/0003_player_rally.sql`, `drizzle/0004_player_changelog.sql`, then
   `drizzle/0005_correct_2026_update_wording.sql`, with
   PostgreSQL `ON_ERROR_STOP`.
2. Configure `NUXT_FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, and
   `MOBILE_LINK_PEPPER` for the website.
3. Configure the same `MOBILE_LINK_PEPPER` for CookieDough and deploy the matching plugin build.
4. Deploy the website, verify public endpoints, then test claim/revoke with a real Firebase test user
   and an in-game link challenge.
5. Populate published news/events. Set `MOBILE_FRIENDS_ENABLED=true` and/or
   `MOBILE_PARTIES_ENABLED=true` only after the matching website, CookieDough, and app versions are
   deployed. Both flags default to false. Free-form chat and shop remain disabled.

## Structured social contract

All social routes require a verified Firebase bearer token and an active primary Minecraft player
link. Writes return HTTP 428 until a primary link exists. Player lookup is exact (case-insensitive),
never a substring search. Pair operations take canonical player advisory locks before reading or
writing friendship/block rows, so opposite-direction requests cannot create duplicates.

`GET /friends` returns:

```json
{
  "data": {
    "player": { "playerId": "uuid", "playerName": "CookiePlayer" },
    "friends": [
      { "playerId": "uuid", "playerName": "Friend", "online": true, "lastSeenAt": "ISO-8601" }
    ],
    "incoming": [{ "playerId": "uuid", "playerName": "Sender", "createdAt": "ISO-8601" }],
    "outgoing": [{ "playerId": "uuid", "playerName": "Target", "createdAt": "ISO-8601" }]
  }
}
```

`GET /party` returns `{ "data": { "party": null, "incomingInvites": [] } }` when the player is not
in a party. An active party contains `id`, `leaderPlayerId`, `members`, and leader-only
`pendingInvites`. Member `online` is accurate only for accepted friends; non-friends receive
`false`, so party membership does not disclose otherwise private presence. `incomingInvites`
contains `id`, `partyId`, `leaderPlayerId`, `leaderPlayerName`, and `expiresAt`.

Parties are capped at four active members. Party mutations use the same player advisory lock as
CookieDough (`pg_advisory_xact_lock(hashtextextended(player_id::text, 0))`) and lock the party row
before capacity changes. Invitations expire after 15 minutes. Blocking removes friendships,
cancels pairwise pending party invites, and separates players who share a party. Friend and party
invite creation adds `friend_request` and `party_invite` rows to the existing FCM outbox in the same
transaction.

`GET|PUT /notification-preferences` exposes `rallyEnabled` for player-call notifications. It is
`false` by default and must be explicitly enabled by the user.

## Notification delivery worker

After the migration is installed, set `MOBILE_NOTIFICATION_WORKER_ENABLED=true` on every website
replica. Rows are claimed with `FOR UPDATE SKIP LOCKED` and a per-claim UUID, so only the replica
that owns the current claim can finish or reschedule it. Stale claims are recovered after
`MOBILE_NOTIFICATION_STALE_LOCK_SECONDS`; notification retries stop at
`MOBILE_NOTIFICATION_MAX_ATTEMPTS`. FCM requests contain the outbox ID as their collapse key and
data field. Delivery is therefore at-least-once, with platform collapse reducing the narrow
duplicate window after a network timeout. The `firebase_auth_delete` job is safety-critical: it is
never dead-lettered, retries indefinitely with capped exponential delay, retains its last error, and
emits an error-level event on every failed attempt so monitoring can alert operators.

The worker recognizes these producer kinds and corresponding user preference switches:

- `announcement`, `announcements`, `news`, `news_published`
- `event`, `event_reminder`, `event_start`
- `server_status`, `server_offline`, `server_recovered`
- `social`, `friend_request`, `party_invite`
- `player_rally` (dedicated `rallyEnabled` preference, disabled by default)
- `weekly_digest`

An audience must have exactly one selector: `{ "all": true }`, a `firebaseUid`, a
`mobileUserIds` array, or a `deviceIds` array. A visible payload accepts `title`, `body`, optional
HTTPS `imageUrl`, a `cookiebuild://` or `https://www.cookie-build.com` `deepLink`, scalar `data`, and an
optional `urgent` boolean. Per-user preferences, notification authorization, revoked devices, and
quiet hours are applied before sending. Invalid/unregistered tokens are revoked; transient token
failures are retried without re-sending to devices that already succeeded. One row is intentionally
limited to 5,000 eligible devices; larger campaigns must be segmented by `mobileUserIds`.

### Structured player rally producer contract

CookieDough inserts a rally into the shared outbox with `kind = 'player_rally'`,
`audience = { "all": true }`, and this exact payload shape:

```json
{
  "schemaVersion": 1,
  "rallyId": "0772c75e-d8a7-4e9d-98a1-f1744dde448e",
  "source": "player",
  "gamemode": "microbattles",
  "edition": "crossplay",
  "queuedCount": 2,
  "neededCount": 6,
  "actorDisplayName": "CookiePlayer"
}
```

`gamemode` is one of `microbattles`, `pitchout`, `skywars`, or `buildbattles`.
`neededCount` is the number of additional players needed to reach the minimum start threshold.
`actorDisplayName` is the bounded public Bukkit name for a player request and must be `null` when
`source = 'automatic'`. No title, body, URL, message, or other free-text field is accepted. The
website synthesizes the visible notification and deep link. `rallyId` has a partial unique index for
durable producer deduplication; CookieDough additionally owns transactional global and per-game
cooldowns.

Firebase Admin credentials are resolved in this order:

1. `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64`, containing the base64 encoding of the service-account
   JSON as a Dokploy secret environment value.
2. Application Default Credentials, including the file referenced by
   `GOOGLE_APPLICATION_CREDENTIALS`.

Never store either credential in Git or logs. `NUXT_FIREBASE_PROJECT_ID` should also be set
explicitly. The same worker retries `firebase_auth_delete` rows created by account deletion, but
those rows never invoke FCM. After Firebase confirms deletion, the original Firebase UID is
atomically replaced with a `deleted:<internal-user-id>` marker while a SHA-256 tombstone is stored
to reject already-issued tokens. The outbox row is marked delivered and its UID-bearing audience is
cleared in that same transaction, including when direct API completion races worker completion.
