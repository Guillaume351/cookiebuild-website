# Consent-based site and shop analytics

`NUXT_PUBLIC_GA_MEASUREMENT_ID` defaults to empty. Set only the verified GA4 web-stream ID.
Only `cookie-build.com` and `www.cookie-build.com` can load or emit to the live stream. Local and preview hosts are disabled. DNT/GPC default to refusal when no current choice exists.
Before enabling it, turn off every Enhanced Measurement automatic event in the GA4 stream
(page views, outbound clicks, forms, search, scroll, downloads and video). This integration emits
explicit events only: automatic outbound/form capture could otherwise include a checkout URL or
recipient search. Advertising signals and automatic page views are disabled in the tag configuration.

Google's basic consent mode is used: the tag is not loaded and no events are queued before permission.
Decline and Allow have equal prominence; footer preferences allow withdrawal. The first-party choice
expires after 180 days; GA cookie expiry is also limited to 180 days without renewal on visits.
The expanded site-wide scope uses `cb_analytics_consent_v2`: previous shop-only permission is not reused, while an existing refusal is preserved. Withdrawal disables the tag, updates consent and removes GA cookies for this
site. If withdrawal happens while the tag is still loading, pending events are discarded and its script is detached. Previously sent measurements are not retroactively removed by withdrawing permission.

| Event | Trigger | Allowed business fields |
| --- | --- | --- |
| `page_view` | Initial public page and SPA path navigation after consent | bounded page category, site language, source group |
| `join_guide_open` | Open home join instructions | same public page context |
| `server_address_copy` | Successful server address copy (not port copy) | same public page context |
| `bedrock_server_add` | Open Minecraft server link | same public page context |
| `discord_open` | Click home Discord link | same public page context |
| `shop_entry` | Click header/footer/home shop link | same public page context |
| `shop_view` | Mounted shop page with consent, once per mount | none |
| `free_effect_click` | Free-offer CTA | source: home/shop; fixed free item ID |
| `recipient_selected` | Existing recipient chosen | edition: java/bedrock |
| `player_link_success` | Player-link request confirmed | none |
| `begin_checkout` | Checkout creation request confirmed | canonical product, category, price, EUR, quantity 1 |
| `portal_open` | Billing portal creation request confirmed | none |

Shop events retain their fixed `/shop` page location. Site events use only exact allowlisted public paths; news article slugs become `/updates/article`. Admin, account, checkout and arbitrary paths do not generate page views. All events use an empty referrer and fixed titles. Public route changes also set these sanitized fields globally for any automatic engagement context. Source groups (direct/internal/google/bing/duckduckgo/discord/social/other) are classified locally from the document referrer; neither its hostname nor URL is exported. Query strings, hashes and UTM values are never captured. Source groups describe the current document entry, not a reconstructed cross-device acquisition journey.

Caller objects are never forwarded:
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

GA property setup: retain Enhanced Measurement disabled. Register `page_group`, `site_language`, and `traffic_source_group` as event-scoped custom dimensions to use the bounded site context in reports. Existing `source` and `edition` shop dimensions remain unchanged. Mark `server_address_copy`, `bedrock_server_add` and `discord_open` as key events if desired; these are intent signals, not confirmed game joins.
