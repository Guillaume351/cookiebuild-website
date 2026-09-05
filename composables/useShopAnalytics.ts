import { analyticsProductionHost, defaultAnalyticsConsent, dispatchSiteAnalytics, trafficSourceGroup, type SiteAnalyticsEvent } from "../utils/site-analytics";
import { dispatchShopAnalytics, validAnalyticsId, type AnalyticsConsent, type GoogleTag, type ShopAnalyticsEvent, type ShopAnalyticsOptions } from "../utils/shop-analytics";

type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: GoogleTag; [key: `ga-disable-${string}`]: boolean };
let initializedId: string | null = null;
let activeScript: HTMLScriptElement | null = null;
let scriptLoaded = false;

export function useShopAnalytics() {
  const config = useRuntimeConfig();
  const measurementId = config.public.gaMeasurementId;
  const enabled = validAnalyticsId(measurementId) && (!import.meta.client || analyticsProductionHost(location.hostname));
  const previousConsent = useCookie<AnalyticsConsent>("cb_analytics_consent", { readonly: true });
  const consentCookie = useCookie<AnalyticsConsent>("cb_analytics_consent_v2", {
    default: () => defaultAnalyticsConsent(previousConsent.value, import.meta.client ? navigator : {}),
    maxAge: 180 * 86400, sameSite: "lax", path: "/",
  });
  const consent = useState<AnalyticsConsent>("site-analytics-consent-v2", () => consentCookie.value === "granted" || consentCookie.value === "denied" ? consentCookie.value : null);
  // SSR cannot see browser privacy signals; apply the default again after hydration.
  if (import.meta.client && consent.value === null && defaultAnalyticsConsent(previousConsent.value, navigator) === "denied") consent.value = "denied";
  const preferencesOpen = useState("analytics-preferences-open", () => false);

  function initialize() {
    const target = window as unknown as AnalyticsWindow;
    target[`ga-disable-${measurementId}`] = false;
    if (initializedId === measurementId && target.gtag) {
      target.gtag("consent", "update", { analytics_storage: "granted" });
      return target.gtag;
    }
    target.dataLayer ||= [];
    target.gtag ||= function (..._args: unknown[]) { target.dataLayer!.push(arguments); };
    const tag = target.gtag;
    tag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    tag("consent", "update", { analytics_storage: "granted" });
    tag("js", new Date());
    tag("config", measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      cookie_expires: 180 * 86400, cookie_update: false,
      page_location: "https://www.cookie-build.com/", page_referrer: "", page_title: "Cookie Build" });
    const script = document.createElement("script");
    script.id = "cookiebuild-google-analytics";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    activeScript = script;
    scriptLoaded = false;
    script.onload = () => { if (activeScript === script) scriptLoaded = true; };
    document.head.append(script);
    initializedId = measurementId;
    return tag;
  }

  function setConsent(value: "granted" | "denied") {
    consent.value = value;
    preferencesOpen.value = false;
    try { consentCookie.value = value; } catch { /* A browser privacy setting must not break this choice. */ }
    if (!import.meta.client || !enabled) return;
    const target = window as unknown as AnalyticsWindow;
    try {
      if (value === "granted") initialize();
      else {
        target[`ga-disable-${measurementId}`] = true;
        if (!scriptLoaded) {
          // A slow or blocked script must not replay pre-withdrawal events when it eventually arrives.
          target.dataLayer?.splice(0);
          activeScript?.remove();
          activeScript = null;
          initializedId = null;
          delete target.gtag;
        } else {
          target.gtag?.("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
        }
        // Remove this site's GA cookies on both host-only and parent-domain scopes.
        for (const cookie of document.cookie.split(";")) {
          const name = cookie.split("=", 1)[0]?.trim();
          if (!name || !/^_ga(?:_|$)/.test(name)) continue;
          for (const domain of ["", location.hostname, location.hostname.replace(/^www\./, "")]) {
            document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
          }
        }
      }
    } catch { /* Analytics must never interrupt navigation or consent controls. */ }
  }

  function track(event: ShopAnalyticsEvent, options?: ShopAnalyticsOptions) {
    if (!import.meta.client || !enabled) return false;
    try { return dispatchShopAnalytics({ id: measurementId, consent: consent.value, event, options, initialize }); }
    catch { return false; } // Analytics must never interrupt an account or checkout action.
  }

  function trackSite(event: SiteAnalyticsEvent, path: string) {
    if (!import.meta.client || !enabled || consent.value !== "granted") return false;
    try {
      return dispatchSiteAnalytics({ id: measurementId, consent: consent.value, event, path,
        source: trafficSourceGroup(document.referrer), initialize });
    } catch { return false; }
  }

  return { enabled, consent, preferencesOpen, setConsent, track, trackSite };
}
