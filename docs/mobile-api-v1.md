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

- `GET /me`: app identity, active Java/Bedrock player links, and `primaryPlayer` with the linked
  player's personal seasonal rank, aggregate XP, exact PostgreSQL-backed daily/weekly goal state,
  achievements, UTC resets, and `nextBestAction`.
- `GET /me/dashboard`: the primary linked player's private live status, coin balance, per-game
  totals, 30-day activity series, progression, selected kits, and up to 15 recent completed matches
  per supported game mode. It is exposed only when `MOBILE_PLAYER_DASHBOARD_ENABLED=true` and the
  required gameplay tables plus `drizzle/0010_friend_suggestions.sql` index are present.
- `GET /kits`: the earned-coin MicroBattles and SkyWars kit catalogs, player eligibility, unlocks,
  weekly-free state, and current selection. `POST /kits/:gamemode/:kitId/purchase` and
  `PUT /kits/:gamemode/:kitId/select` accept an exact integer `level`. Purchases lock the active
  mobile identity, player link, coin balance, and progression in one transaction and reuse the
  in-game idempotent coin-ledger source. Website and CookieDough mutations use the same lock order:
  active mobile identity/link (website only), `playerdata`, then `minigame_progression`. There is no
  real-money checkout. The routes remain unavailable unless `MOBILE_KIT_SHOP_ENABLED=true` and the
  `add-retention-ledger.sql` schema capability check passes.
- `POST /player-link/claim` with `{ "code": "AB23CD45" }`.
- `DELETE /player-link`, optionally filtered with `playerId` and/or `edition` query parameters.
- `POST /devices` and `DELETE /devices/:installationId` for FCM token lifecycle. Registration may
  include an IANA `timezone` plus the paired `timezoneOffsetMinutes` (-840 to 840) and
  timezone-aware `timezoneObservedAt`. Newer observations win on an installation, so a delayed
  launch/token-refresh request cannot overwrite a later timezone snapshot. Device offsets are used
  before the legacy preference offset for quiet-hour delivery.
- `GET|PUT /notification-preferences`.
- `GET /presence` returns accepted friends and current party members only. It never returns a
  public/global online-player list. `PUT /friends/:playerId/online-alert` with `{ "enabled": true }`
  opts into an online alert for one accepted friend; arbitrary-player following is not supported.
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
- `GET /player-rallies/:rallyId` returns an unexpired player call and the authenticated linked
  player's current response. `PUT /player-rallies/:rallyId/response` accepts exactly
  `{ "response": "joining" }` or `{ "response": "unavailable" }`. The first response returns
  `201`, an identical retry returns `200`, and changing an existing response returns `409`.
  Neither endpoint returns the target player's UUID.
- `DELETE /account`: anonymizes mobile profile data, revokes player links, removes notification
  devices, and deletes the Firebase Auth user. A failed Firebase deletion remains in the outbox for
  operator retry while the local account stays disabled.

## Skyblock companion and marketplace

Skyblock is private, linked-player data. `GET /skyblock` returns the active island overview and role,
progression, global `playerdata.coins` balance, storage/listing summaries, and the catalog version.
`GET /skyblock/inventory`, `GET /skyblock/market`, and `GET /skyblock/listings` use opaque `cursor`
pagination with `pageSize` from 1 to 50. Inventory can filter by `category` and `marketable`; market
can filter by allowlisted `itemId`, `category`, `rarity`, `minPrice`, and `maxPrice`, and sort by
`recent`, `price_asc`, or `price_desc`; own listings accept `status`.

Marketplace writes are:

- `POST /skyblock/listing-quotes` with exactly `inventoryItemId`, `quantity`, and total
  `priceCoins`. The server revalidates the versioned catalog, available unreserved island storage,
  item bounds, and returns a five-minute quote with fee/net amounts.
- `POST /skyblock/listings` with exactly `quoteId`.
- `POST /skyblock/listings/:id/cancel` with an empty JSON object.
- `POST /skyblock/listings/:id/purchase` with exactly `expectedPriceCoins`.

The three durable mutations require a canonical UUID `Idempotency-Key`; missing keys return `428`,
reuse with a different request returns `409`, and identical retries return the stored JSON result.
Settlement is one PostgreSQL transaction with deterministic player/island/listing/storage locks,
shared-island reservations, one terminal listing state, a unique sale, and buyer/seller entries in
the existing `coin_transactions` ledger. Purchased resources are delivered directly to the buyer's
authoritative island storage. The app never sells Bukkit/NBT inventory and never uses Stripe or real
money. Only the island owner can sell shared storage; managers and members can read it. Purchases
from the same island are rejected, and stored items plus prepared/marked deposits must fit within
the buyer island's locked storage capacity before any coins or items move.
Successful settlement also completes the seller's `market_seller` quest in the same transaction;
the reward remains explicitly claimable only through gameplay.

Safe island management is exposed separately from marketplace writes:

- `GET /skyblock/management` returns policy version `skyblock-management-v1`, the authenticated
  player's balance, active island/version/role, generator and next upgrade, storage capacity,
  workers with estimated ready quantities, the complete 12-quest arc, coop members, and (when the
  player has no island) their latest non-expired incoming invitation.
- `POST /skyblock/upgrades/generator` requires exactly `expectedIslandVersion`,
  `expectedNextTier`, and `expectedCostCoins`. Owners and managers may upgrade. Cost, next tier,
  build radius, quest progression, island version, coin debit, and the unique `coin_transactions`
  entry are revalidated and committed atomically.
- `POST /skyblock/workers/collect` accepts only `{}`. Any coop role may collect because gameplay
  grants all members shared-storage access. Island, open inventory transfers, storage rows, and
  workers are locked in canonical order. Collection fills only remaining capacity and leaves any
  overflow in worker buffers.
- `POST /skyblock/quests/:id/claim` accepts only `{}`. Any coop role may claim only their own
  completed, unclaimed catalog quest; the coin credit, ledger entry, and claim timestamp share one
  transaction.
- `POST /skyblock/coop/invites/:id/accept` accepts only `{}`. It addresses an invitation already
  returned to the authenticated invitee, then revalidates expiry, absence of another island, and
  the locked coop member limit before adding that same authenticated player.

All four management mutations require a canonical UUID `Idempotency-Key`, return `201` on the first
commit and `200` with the stored response on an identical retry, and accept no player identity in
the request body. Generator upgrades use owner/manager permissions; worker collection and quest
claims allow every active member; invite acceptance is limited to the addressed authenticated
invitee. Independent warehouse/radius upgrades and worker upgrades do not exist in gameplay V1,
so the API does not invent them: build radius is a generator-tier effect and warehouse capacity is
fixed. Outgoing invites, role changes, and kicks remain in-game only because safe mobile target
identity and anti-abuse UX are not part of this V1 contract.

All mobile limits use the shared PostgreSQL `mobile_rate_limits` window, keyed by a SHA-256 digest
instead of raw account, address, or player identifiers. A rejected request returns `429` with an
integer `Retry-After` header. Read-only routes may temporarily fall back to a bounded in-process
window if PostgreSQL is unavailable; economic and identity mutations fail closed with `503` and
`Retry-After: 5`, so a multi-replica outage cannot silently weaken write protection.

The independent Skyblock maintenance runner expires active listings in bounded, locked batches,
releases their reservations atomically, and purges consumed or expired quotes, old idempotency
results, and expired rate-limit rows. Each operation is safe to repeat. It runs every five minutes
only when `MOBILE_SKYBLOCK_MAINTENANCE_ENABLED=true`; keep this off until migration 0013 is applied.
Disabling it pauses cleanup but never enables a feature or a market write.

Privacy-safe product metrics are exposed only at `GET /api/internal/metrics` with a bearer secret of
at least 32 characters in `COOKIEBUILD_METRICS_TOKEN`. Labels are restricted by
`contracts/product-events-v1.json` to event, result, and source; names, UUIDs, addresses, tokens,
and free-form route values are never labels. Prometheus must scrape this private endpoint over the
internal HTTPS or service network with the token stored outside Git. The shared
`cookiebuild_funnel_events_total` schema lets dashboards compare existing Java and mobile API
events without adding Java and Bedrock server-status player probes together.

All three capabilities fail closed. Reads require `MOBILE_SKYBLOCK_ENABLED=true` plus the complete
Skyblock schema, including the crash-safe `skyblock_inventory_transfers` hand-off table. Writes
require independent flags: `MOBILE_SKYBLOCK_MANAGEMENT_WRITES_ENABLED=true` for the safe management
routes and `MOBILE_SKYBLOCK_MARKET_WRITES_ENABLED=true` for marketplace settlement. Each also
requires its full schema prerequisites, `coin_transactions`, and its unique player/source index.
The account export includes the management snapshot, full paginated Skyblock storage and listing
history, plus a privacy-safe transfer history only when the companion capability is live. Transfer
exports omit the Bukkit slot and player/island IDs.

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

1. From the coordinating `Cookies` repository, apply
   `ops/add-retention-ledger.sql` first. It owns `coin_transactions`, the unique
   `(player_id, source)` idempotency constraint, and the progression timestamps used by the kit
   shop. The website deliberately does not duplicate this shared gameplay migration.
2. Apply the canonical `Cookies/ops/add-skyblock-v1.sql` migration. The website declares the shared
   tables in Drizzle for type safety but deliberately owns no numbered Skyblock migration.
3. Before enabling the gameplay plugin, configure Paper with
   `bukkit.yml` `settings.save-player-data: true` and `spigot.yml`
   `players.disable-saving: false`. Skyblock fails closed without both gates because live inventory,
   location, and the durable activity/transfer markers must survive reconnects.
4. Apply `drizzle/0001_mobile_foundation.sql`, `drizzle/0002_mobile_social.sql`,
   `drizzle/0003_player_rally.sql`, `drizzle/0004_player_changelog.sql`,
   `drizzle/0005_correct_2026_update_wording.sql`, `drizzle/0006_mobile_engagement.sql`,
   `drizzle/0007_admin_control_center.sql`, `drizzle/0008_player_onboarding.sql`, then
   `drizzle/0009_player_rally_responses.sql`, `drizzle/0010_friend_suggestions.sql`, then
   `drizzle/0011_mobile_device_timezone.sql`, `drizzle/0012_changelog_supersession.sql`, then
   `drizzle/0013_mobile_platform_consolidation.sql`, with PostgreSQL `ON_ERROR_STOP`. Migration 0013
   installs the shared rate-limit store before any consolidated mobile write is released.
5. Configure `NUXT_FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, and
   `MOBILE_LINK_PEPPER` for the website.
6. Configure the same `MOBILE_LINK_PEPPER` for CookieDough and deploy the matching plugin build.
7. Run `npm run kit-catalog:verify-gameplay -- ../Cookies` and
   `npm run skyblock-catalog:verify-gameplay -- ../Cookies` plus
   `npm run skyblock-management:verify-gameplay -- ../Cookies` from the website checkout. These
   explicit cross-repository release gates verify the gameplay catalogs, generator tiers/radii,
   worker production, and complete quest arc against the Docker-local, versioned website contracts;
   ordinary website tests never read outside their build context.
8. Deploy the website, verify public endpoints, then test claim/revoke with a real Firebase test user
   and an in-game link challenge.
9. Populate published news/events. Set `COOKIEBUILD_BEDWARS_ENABLED=true` on both
   the Minecraft and website services only while the BedWars beta is open. Set
   `MOBILE_FRIENDS_ENABLED=true` and/or
   `MOBILE_PARTIES_ENABLED=true` only after the matching website, CookieDough, and app versions are
   deployed. These flags default to false. Free-form chat remains disabled. Set
   `MOBILE_KIT_SHOP_ENABLED=true` and `MOBILE_PLAYER_DASHBOARD_ENABLED=true` only after the matching
   website, mobile app, gameplay catalogs, and database prerequisites are deployed. The bootstrap
   and private routes fail closed when either the explicit flag or runtime schema capability is
   absent. Enable `COOKIEBUILD_SKYBLOCK_ENABLED=true` only after both Paper persistence gates, the
   gameplay migration, matching JARs, and catalog are in place. Enable `MOBILE_SKYBLOCK_ENABLED=true`
   only after the gameplay migration, both Skyblock policy gates, website, and app are deployed;
   enable `MOBILE_SKYBLOCK_MANAGEMENT_WRITES_ENABLED=true` only after authenticated
   generator/worker/quest/invite concurrency smokes pass. Independently enable
   `MOBILE_SKYBLOCK_MARKET_WRITES_ENABLED=true` only after authenticated
   quote/create/cancel/purchase smoke tests pass.

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
    "outgoing": [{ "playerId": "uuid", "playerName": "Target", "createdAt": "ISO-8601" }],
    "suggestions": [
      { "playerId": "uuid", "playerName": "RecentPlayer", "reason": "played_together" }
    ]
  }
}
```

Suggestions contain only privacy-safe recent co-players and can be acted on by stable player ID;
they do not expose a searchable global player roster.

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

Mobile 2.1 additionally exposes `dailyReminderEnabled`, `weeklyReminderEnabled`, and
`friendOnlineEnabled`; all three default to `false`. Friend-online delivery also requires an
enabled per-friend alert on an accepted friendship. `onlineVisibility` is one of
`friends_and_party`, `friends`, or `hidden`. Blocking removes the friendship and suppresses both
presence and queued online-alert production. Quiet hours are applied only when
`quietHoursEnabled` is true; numeric hour values sent by the mobile app are normalized to the
existing `HH:00` storage format.

## Goal and personal-rank contract

CookieDough stores `player_goal_progress` after every match. The legacy `goals.yml` file is imported
once for players without a database row, while existing database rows remain authoritative. Daily
goals reset at 00:00 UTC and weekly goals at Monday 00:00 UTC. Reward claims remain idempotent in the
coin-transaction ledger; daily/weekly rewards now grant both minigame XP and coins.

`GET /me` adds:

```json
{
  "data": {
    "primaryPlayer": {
      "playerId": "uuid",
      "playerName": "CookiePlayer",
      "edition": "java",
      "online": true,
      "rank": { "position": 12, "total": 845, "period": "season", "gamemode": "all" },
      "progression": {
        "level": 3,
        "xp": 520,
        "xpIntoLevel": 120,
        "xpForNextLevel": 500,
        "resetTimezone": "UTC",
        "daily": {},
        "dailyQuests": [],
        "weeklyQuests": [],
        "achievements": { "completed": 2, "total": 3 },
        "nextBestAction": null
      }
    }
  }
}
```

Each goal has `id`, `title`, `description`, `progress`, `target`, `completed`, `rewardXp`,
`rewardCoins`, `claimRequired: false`, `rewardDelivery: "automatic"`, and `resetsAt`. CookieDough
credits completed rewards through the idempotent transaction ledger; the app must not show a
manual claim button. `GET /presence` returns
`{ "data": { "friends": [], "partyMembers": [] } }`; entries have `playerId`, `playerName`,
`online`, `lastSeenAt`, and `onlineAlertEnabled`.

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
- `daily_goal_reminder` (dedicated opt-in, one row per player/UTC day)
- `weekly_goal_reminder` (dedicated opt-in, one row per player/ISO week)
- `friend_online` (global plus accepted-friend opt-ins, one row per session, six-hour pair cooldown)

An audience must have exactly one selector: `{ "all": true }`, a `firebaseUid`, a
`mobileUserIds` array, or a `deviceIds` array. A visible payload accepts `title`, `body`, optional
HTTPS `imageUrl`, a `cookiebuild://` or `https://www.cookie-build.com` `deepLink`, scalar `data`, and an
optional `urgent` boolean. Per-user preferences, notification authorization, revoked devices, and
quiet hours are applied before sending. Player rallies also exclude users whose linked Minecraft
account is already online. Quiet-hour recipients are intentionally suppressed rather
than deferred: a stale daily nudge or online-presence alert must not arrive after the moment that
made it useful. The structured delivery log records the suppression count. Invalid/unregistered
tokens are revoked; transient token
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

`source` is `login`, `player`, or `automatic`. Login rallies use `gamemode = 'network'`, zero queue
counts, and a bounded `actorDisplayName`; the website generates
`<actorDisplayName> is online and looking for players`. Queue rallies use one of `microbattles`,
`pitchout`, `skywars`, `buildbattles`, or `turfwars` and never use `network`.
`neededCount` is the number of additional players needed to reach the minimum start threshold.
It may be `0` only for an automatic start-imminent rally, in which case `queuedCount` must be
positive and the generated copy invites players to join before the match starts. Player-requested
rallies always require at least one missing player.
`actorDisplayName` is the bounded public Bukkit name for login and player requests and must be
`null` when `source = 'automatic'`. No title, body, URL, message, or other free-text field is
accepted. The website synthesizes the visible notification and
`cookiebuild://rallies/<rallyId>` deep link. `rallyId` has a partial unique index for durable producer
deduplication; CookieDough additionally owns transactional global and per-game cooldowns. The
producer also inserts `player_rallies` in the same transaction: its `id` is the payload `rallyId`,
its unique `outbox_id` references the notification row with cascading deletion, and it records the
target player, originating server, optional game, availability time, and five-minute expiration.

The response API requires a current primary player link, rejects self-responses, hides rallies when
either player has blocked the other, returns `410` after `expiresAt`, and records at most one fixed
response per rally and responder. Login, player-requested, and automatic rallies are actionable
because each registry row has a `target_player_id`; the public DTO exposes only `id`, `source`,
`gamemode`, `targetPlayerName`, `expiresAt`, and `response`. Response rows remain pending until
CookieDough sets `delivered_at` after showing the predefined result in game.

The worker sends rallies through a five-minute, high-priority transport window and logs
selected, eligible, quiet-hour-suppressed, already-online-excluded, and end-to-end queue latency
counts for operational diagnosis.

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
### Schema drift gate

`npm run schema:verify` checks the website model against
`contracts/skyblock-schema-v1.json`. Release/preflight CI that has the gameplay
repository must also set `COOKIEBUILD_GAMEPLAY_SCHEMA_SQL` to
`Cookies/ops/add-skyblock-v1.sql`; the command then requires its reviewed SHA-256
to match. A gameplay migration change must update the website model and contract
in the same release, never by silently accepting a new hash.
