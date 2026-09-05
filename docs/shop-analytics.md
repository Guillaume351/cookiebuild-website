# Consent-based shop analytics

`NUXT_PUBLIC_GA_MEASUREMENT_ID` defaults to empty. Set only the verified GA4 web-stream ID.
Before enabling it, turn off every Enhanced Measurement automatic event in the GA4 stream
(page views, outbound clicks, forms, search, scroll, downloads and video). This integration emits
explicit events only: automatic outbound/form capture could otherwise include a checkout URL or
recipient search. Advertising signals and automatic page views are disabled in the tag configuration.

Google's basic consent mode is used: the tag is not loaded and no events are queued before permission.
Decline and Allow have equal prominence; footer preferences allow withdrawal. The first-party choice
expires after 180 days. Withdrawal disables the tag, updates consent and removes GA cookies for this
site. Previously sent measurements are not retroactively removed by withdrawing permission.

| Event | Trigger | Allowed business fields |
| --- | --- | --- |
| `shop_view` | Mounted shop page with consent, once per mount | none |
| `free_effect_click` | Free-offer CTA | source: home/shop; fixed free item ID |
| `recipient_selected` | Existing recipient chosen | edition: java/bedrock |
| `player_link_success` | Player-link request confirmed | none |
| `begin_checkout` | Checkout creation request confirmed | canonical product, category, price, EUR, quantity 1 |
| `portal_open` | Billing portal creation request confirmed | none |

All events use a fixed `/shop` page location and empty referrer. Caller objects are never forwarded:
names, player UUIDs, linking codes, recipient searches, order/session references, URLs and email are
excluded. There is no `purchase` event on the Stripe return page. Revenue and completed purchases
must use confirmed payment records, not these browser actions; a future GA purchase integration
needs explicit consent propagation and transaction deduplication first.

Consent-based funnel counts are incomplete by design. Compare them with operational/payment counts
in Grafana without treating unconsented sessions or blocked tags as failed conversions.

Official references:
- https://developers.google.com/tag-platform/security/concepts/consent-mode
- https://developers.google.com/tag-platform/gtagjs/reference
- https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
