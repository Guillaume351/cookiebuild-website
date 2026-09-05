# Stripe web commerce

This integration is web-only. The mobile app has no catalog, checkout, external-payment CTA, receipt
verification, or commerce API. Minecraft access is delivered only by the canonical Stripe event worker;
no browser or admin route grants an entitlement directly.

## Trust and identity flow

1. Prices, duration and grants are public at `GET /api/cosmetics/catalog` before sign-in.
2. The player runs `/support link` in game. CookieDough stores an eight-character, ten-minute
   `commerce_session` challenge. `/app link` continues to create `mobile_link`; neither consumer can
   claim the other purpose.
3. `POST /api/commerce/session` consumes the commerce challenge and returns a hashed-database,
   `HttpOnly`, `Secure` in production, `SameSite=Lax` web session. Lax is required for the top-level
   return from Stripe Checkout. Every unsafe browser API still requires same-origin and a
   double-submit CSRF header/cookie.
4. Checkout uses only the linked `player_id`. Stripe collects the billing email/address and payment
   method. Cookie Build stores transaction identifiers and state, never full card data.

The ingress must replace, not append, trusted proxy headers and accept traffic only from the known
reverse proxy. Application rate limiting uses the trusted client IP; a public client must not be able
to forge `X-Forwarded-For`.

## Runtime configuration and fail-closed launch

Copy the documented keys from `.env.example`. Live Checkout stays disabled until all of these are
valid: matching live Stripe key/mode, webhook secret, HTTPS public URL, an explicit automatic-tax true/false choice, and (when enabled) explicit
Stripe tax codes for digital access and voluntary support, seller legal name/address/support email,
business status/identifier, and VAT status/identifier when applicable.
Cookie Build does not invent those values.

Mediator name and HTTPS URL are optional configuration. Their absence does not disable Checkout;
the terms and support pages display mediator details only when both values are configured.

`sk_test_*`, `rk_test_*`, `sk_live_*`, and `rk_live_*` are accepted only in their matching mode.
Use two separate restricted keys:

- The temporary bootstrap key has write access only to Products, Prices, Customer Portal and Webhook
  Endpoints. Revoke it as soon as the Stripe objects have been created and verified.
- The runtime key has Customers and Checkout Sessions write, Customer Portal write, Products and
  Prices read, Payment Intents read, Events read, Invoices read, Subscriptions write, Charges and
  Refunds write, and Payment Disputes read. Everything else remains disabled. `Events: Read` can see
  every Stripe event in the account because the asynchronous worker retrieves the canonical event;
  the webhook endpoint still subscribes only to the fourteen documented event types.

Apply an IP restriction only when every legitimate egress address is known and stable. Never install
the temporary bootstrap key in the application runtime, Dokploy, CI, or a repository file.

Before Stripe has activated Payments for the account, the Dashboard can refuse restricted keys that
request Checkout, Payment Intent or Subscription permissions even in test mode. An isolated local
sandbox may then use a freshly rotated standard `sk_test_*` key kept only in macOS Keychain. This is
strictly temporary: never install it in production, revoke it after account activation, and replace it
with the restricted runtime policy above before any staging or live deployment.

`NODE_ENV=production` plus `COMMERCE_STRIPE_MODE=test` is rejected by the catalog, webhook, and worker
unless `COMMERCE_ALLOW_TEST_MODE_IN_PRODUCTION=true`. That override is only for an explicitly isolated
staging deployment with a staging database; never point it at production player data.

KYC, beneficial-owner checks, bank account, seller legal status, tax registrations/tax-code choice,
VAT, mediator details, descriptor, support operation and refund policy are human decisions. The
bootstrap cannot make them legally correct.

## Idempotent Stripe bootstrap

Dry-run is the default and performs no Stripe mutation:

```sh
npm run commerce:bootstrap
```

After reviewing the plan, run interactively:

```sh
npm run commerce:bootstrap -- --apply
```

Products are resolved by the immutable pair `metadata.cookiebuild_product_id` +
`metadata.cookiebuild_product_version`; Prices by a `lookup_key` carrying that same explicit
version. Duplicate active products/prices/Portal configurations/endpoints or mismatched amount, EUR currency, inclusive
tax behavior, recurrence, livemode, or metadata abort the run. A Price ID alone is never a
commercial identity. Any price, access, or grant change requires incrementing `productVersion` in
the static catalog; bootstrap then creates a new Product/Price contract and leaves historical
versions available to delayed webhooks.

The webhook signing secret is returned by Stripe only when the endpoint is created. Before any
mutation, `--apply` requires `COMMERCE_WEBHOOK_SECRET_FILE` to name a new absolute path in a private
directory outside the repository. The script reserves it exclusively with mode 0600, writes and
syncs a newly created secret there, and never prints the secret. Transfer it to the deployment
secret manager, then securely remove the temporary file. A no-op run removes its empty placeholder.
Existing files and symlinks are rejected, so an earlier secret cannot be overwritten.

For a lost secret, use a fresh destination and unique rotation identifier:

```sh
COMMERCE_WEBHOOK_SECRET_FILE=/private/operator-secrets/new-cookiebuild-webhook \
COMMERCE_WEBHOOK_ROTATION_ID=rotation-2026-09-05 \
  npm run commerce:bootstrap -- --apply --rotate-webhook-secret
```

Rotation leaves the previous endpoint active. Deploy the replacement secret, verify signed delivery,
then retire the old endpoint explicitly in Stripe. During overlap, duplicate events are handled by
the durable event ledger; the endpoint whose signature no longer matches may retry until retired.
Never put the signing secret in repository files, CI output, tickets, or logs.

## Checkout and consumer evidence

Every order snapshots product ID/version/name/access/price/currency, the exact grant IDs, and the
consumer notice version/text and timestamps. Webhooks grant, revoke, and validate historical Stripe
objects against this immutable order snapshot—not the current catalog or mutable Stripe Product
metadata. The public CTA says `Acheter et payer X €`, `S’abonner et payer X € / mois`, or `Soutenir
et payer X €`. No box is preselected.

- Permanent digital access requires separate immediate-performance and withdrawal-waiver checks.
- The monthly subscription retains an initial 14-day withdrawal action in online history. It queues
  an idempotent immediate subscription cancellation and full refund; the webhook remains the source
  of truth.
- Voluntary support is a repeatable service tip, never charitable fundraising, and grants nothing.

The portal session is authenticated and resolves the unique active Portal configuration carrying
`metadata.cookiebuild=commerce-v1`; cancellation defaults to period end. Purchase history exposes
only the Cookie Build order ID, public product snapshot, amount, state, consent evidence, and
sanitized lifecycle entries—never Stripe customer/payment IDs or raw event payloads.

## Webhooks, sources and reconciliation

`POST /api/commerce/webhook` reads a maximum 1 MiB raw body, verifies `Stripe-Signature`, verifies
test/live mode, and persists only event ID/type/object ID/livemode. It returns `202`; it does not
store the payload or PII.

The multi-replica worker claims rows with `FOR UPDATE SKIP LOCKED`, a five-minute stale timeout and a
per-attempt lock token. It retrieves the canonical Event and current Stripe object, then applies DB
changes transactionally. A stale worker cannot overwrite a reclaimed or processed row.

- One-time source: `stripe:order:<order_uuid>`.
- Subscription source: one stable hashed source per invoice and order. Coverage comes from that
  invoice line's own `period.end`, never the subscription's newer current period.
- Dispute-win recovery: a new stable `stripe:restore:<order_uuid>:<hash>` source. The revoked source
  remains terminal, so delayed success events cannot resurrect it.
- Total refund/dispute revokes the payment source concerned; other paid subscription periods remain
  independent. Terminal subscription cancellation revokes every source belonging to that order.
- Renewal extends access without shortening it. `cancel_at_period_end` keeps current access until
  expiry. Payment failure does not revoke a still-covered prior invoice.

To inspect without mutation, run `npm run commerce:reconcile`. To reset failed/stale envelopes for
the application worker after review, run `npm run commerce:reconcile -- --apply`. The admin Commerce
screen offers the same audited retry/reconciliation controls. Neither path changes entitlements
directly.

## Admin operations

`commerce:read` is available to viewers; `commerce:write` to operators/owners. The backoffice exposes
sanitized orders, subscriptions, payments, readiness, and failed/stale envelopes. Full-refund and
retry/reconcile actions require recent admin authentication, CSRF, same-origin, an explicit reason,
Stripe idempotency, and an audit entry. The refund action only calls Stripe; refund webhooks apply the
payment and entitlement outcome.

Before a live release, revalidate Minecraft Usage Guidelines, French/EU consumer wording, seller
details, tax handling, Stripe event delivery, Customer Portal, a real test-mode purchase/refund/
dispute, entitlement expiry, online history, rollback, and production backup/reconciliation.

Automatic tax is a configurable Stripe feature, not a mandatory paid-service prerequisite. Seller/VAT information and the deliberate live tax choice must reflect the actual business. Migrations are `0015_cosmetic_entitlements.sql` and `0016_stripe_commerce.sql`, after the existing mobile-platform and Skyblock migrations.

Every minute the worker reconciles pending Checkouts, recovers sessions whose creation response was lost, and queues matching canonical Stripe Events through the same idempotent worker. It never creates a second checkout or grants access directly. Sessions explicitly expire after 31 minutes (including a minute of margin above Stripe’s minimum); an ambiguous transport failure retains the active-order guard until recovery.

Mobile-account deletion leaves the Minecraft player row and separate commerce records intact. Commerce authentication expires after 30 days; no automatic statutory-billing purge is claimed. Retention/privacy requests require operator processing against actual record obligations.


## Guest purchases and gifts

`commerce_orders.player_id` is the recipient of fulfillment. Billing authority is
`payer_player_id` for linked buyers or `payer_guest_id` for anonymous buyers.
Migration 0018 backfills existing orders to their original linked payer. Never
use the recipient identity to authorize history, a portal, withdrawal, or a
pending Checkout URL. Stripe customers for guests are distinct from the player's
existing customer; an unverified email must never merge customers.

A guest capability is generated from 32 random bytes, stored only as a SHA-256
hash, and carried in a Secure/HttpOnly/SameSite=Lax cookie in production for 30
days. An existing guest capability remains the billing identity if a Minecraft
player is linked later; linking controls inventory independently. The history
page can explicitly expire the guest capability on a shared browser.

Set `COMMERCE_PORTAL_LOGIN_URL` to the enabled Stripe no-code portal login URL.
After cookie loss/expiry, email verification on Stripe can recover subscription
management. Stripe may select only the most recent active customer when one
email has multiple customer records; support with the relevant Stripe receipt
is the fallback for missing older subscriptions. Checkout IDs and recipient
nicknames are never authentication credentials.

**Rollback:** after gift orders exist, the previous recipient-authorized billing
backend is unsafe. Retain the payer authorization changes when rolling back, or
disable checkout/history/portal/withdrawal routes. Do not revert to exposing
orders by recipient UUID.
