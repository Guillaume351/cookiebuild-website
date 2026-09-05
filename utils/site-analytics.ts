import { siteLocaleFromPath, stripSiteLocale } from "./site-locales";
import { validAnalyticsId, type AnalyticsConsent, type GoogleTag } from "./shop-analytics";

// Exact public routes only: arbitrary paths, account pages and admin views never leave the site.
const pages = {
  "/": "Home", "/games": "Games", "/bedwars": "BedWars", "/skyblock": "Skyblock",
  "/build-battle": "Build Battle", "/microbattles": "Microbattles", "/pitchout": "Pitchout",
  "/skywars": "Skywars", "/turfwars": "Turf Wars", "/updates": "Updates",
  "/player-stats": "Player statistics", "/support": "Support", "/status": "Server status",
  "/rules": "Rules", "/shop": "Shop", "/privacy": "Privacy", "/terms": "Terms",
} as const;
export type SiteAnalyticsEvent = "page_view" | "join_guide_open" | "server_address_copy" | "bedrock_server_add" | "discord_open" | "shop_entry";
export type TrafficSourceGroup = "direct" | "internal" | "google" | "bing" | "duckduckgo" | "discord" | "social" | "other";
const trafficGroups: readonly string[] = ["direct", "internal", "google", "bing", "duckduckgo", "discord", "social", "other"];

export function analyticsPage(path: string) {
  const base = stripSiteLocale(path).replace(/\/+$/, "") || "/";
  if (Object.hasOwn(pages, base)) return { path: base, title: pages[base as keyof typeof pages], locale: siteLocaleFromPath(path).code };
  // News pages are public but their slugs may be user supplied. Group them, never forward a slug.
  if (/^\/updates\/[^/]+$/.test(base)) return { path: "/updates/article", title: "Update article", locale: siteLocaleFromPath(path).code };
  return null;
}

/** Classify locally; neither the referrer URL nor its hostname is sent to Google. */
export function trafficSourceGroup(referrer: string): TrafficSourceGroup {
  if (!referrer) return "direct";
  try {
    const url = new URL(referrer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "other";
    const host = url.hostname.toLowerCase();
    const matches = (domain: string) => host === domain || host.endsWith(`.${domain}`);
    if (matches("cookie-build.com")) return "internal";
    if (["google.com", "google.fr", "google.de", "google.co.uk", "google.it", "google.es", "google.be", "google.ca"].some(matches)) return "google";
    if (matches("bing.com")) return "bing";
    if (matches("duckduckgo.com")) return "duckduckgo";
    if (["discord.com", "discord.gg"].some(matches)) return "discord";
    if (["youtube.com", "youtu.be", "facebook.com", "instagram.com", "tiktok.com", "reddit.com", "x.com", "t.co"].some(matches)) return "social";
  } catch { /* A malformed referrer is never exported. */ }
  return "other";
}

export function dispatchSiteAnalytics(input: {
  id: unknown; consent: AnalyticsConsent; event: SiteAnalyticsEvent; path: string;
  source: TrafficSourceGroup; initialize: () => GoogleTag;
}) {
  if (!validAnalyticsId(input.id) || input.consent !== "granted") return false;
  if (!["page_view", "join_guide_open", "server_address_copy", "bedrock_server_add", "discord_open", "shop_entry"].includes(input.event)) return false;
  const page = analyticsPage(input.path);
  if (!page) return false;
  const tag = input.initialize();
  const context = { page_location: `https://www.cookie-build.com${page.path}`,
    page_title: `Cookie Build · ${page.title}`, page_referrer: "" };
  // Keep automatic engagement context sanitized too; never expose location.href or document.title.
  tag("config", input.id, { ...context, send_page_view: false });
  tag("event", input.event, {
    send_to: input.id, ...context,
    page_group: page.path, site_language: page.locale,
    traffic_source_group: trafficGroups.includes(input.source) ? input.source : "other",
  });
  return true;
}


export function analyticsProductionHost(hostname: string) {
  return hostname === "cookie-build.com" || hostname === "www.cookie-build.com";
}

export function defaultAnalyticsConsent(previous: AnalyticsConsent, signals: { globalPrivacyControl?: boolean; doNotTrack?: string | null }): AnalyticsConsent {
  return previous === "denied" || signals.globalPrivacyControl === true || signals.doNotTrack === "1" ? "denied" : null;
}
