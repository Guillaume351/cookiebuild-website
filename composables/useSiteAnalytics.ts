import type { SiteAnalyticsEvent } from "../utils/site-analytics";

export function useSiteAnalytics() {
  const analytics = useShopAnalytics();
  const route = useRoute();
  return { track: (event: SiteAnalyticsEvent) => analytics.trackSite(event, route.path) };
}
