import eventContract from "../../contracts/product-events-v1.json";

const allowedEvents = new Set(eventContract.mobileEvents);
const allowedResults = new Set(eventContract.results);
const counters = new Map<string, number>();
const durationSums = new Map<string, { count: number; sum: number }>();

export type MobileMetricResult = "success" | "client_error" | "rate_limited" | "server_error";

const routeEvents: ReadonlyArray<[RegExp, string]> = [
  [/^\/api\/mobile\/v1\/bootstrap$/, "mobile_bootstrap_viewed"],
  [/^\/api\/mobile\/v1\/me\/dashboard$/, "mobile_dashboard_viewed"],
  [/^\/api\/mobile\/v1\/kits$/, "mobile_kit_shop_viewed"],
  [/^\/api\/mobile\/v1\/skyblock$/, "skyblock_overview_viewed"],
  [/^\/api\/mobile\/v1\/skyblock\/inventory$/, "skyblock_inventory_viewed"],
  [/^\/api\/mobile\/v1\/skyblock\/market$/, "skyblock_market_viewed"],
  [/^\/api\/mobile\/v1\/skyblock\/listings$/, "skyblock_listings_viewed"],
  [/^\/api\/mobile\/v1\/skyblock\/management$/, "skyblock_management_viewed"],
  [/^\/api\/mobile\/v1\/skyblock\/quests\/[^/]+\/claim$/, "skyblock_quest_claimed"],
  [/^\/api\/mobile\/v1\/skyblock\/workers\/collect$/, "skyblock_worker_collected"],
  [/^\/api\/mobile\/v1\/skyblock\/upgrades\/generator$/, "skyblock_generator_upgraded"],
  [/^\/api\/mobile\/v1\/skyblock\/coop\/invites\/[^/]+\/accept$/, "skyblock_coop_joined"],
  [/^\/api\/mobile\/v1\/skyblock\/listing-quotes$/, "skyblock_listing_quoted"],
  [/^\/api\/mobile\/v1\/skyblock\/listings\/[^/]+\/cancel$/, "skyblock_listing_cancelled"],
  [/^\/api\/mobile\/v1\/skyblock\/listings\/[^/]+\/purchase$/, "skyblock_listing_purchased"],
];

export function mobileEventForRequest(path: string, method: string) {
  const normalized = path.split(/[?#]/, 1)[0] || "/";
  if (normalized === "/api/mobile/v1/skyblock/listings" && method.toUpperCase() === "POST") {
    return "skyblock_listing_created";
  }
  return routeEvents.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
}

export function mobileMetricResult(statusCode: number): MobileMetricResult {
  if (statusCode >= 200 && statusCode < 400) return "success";
  if (statusCode === 429) return "rate_limited";
  if (statusCode >= 400 && statusCode < 500) return "client_error";
  return "server_error";
}

export function recordMobileProductEvent(event: string, result: MobileMetricResult, durationSeconds: number) {
  if (!allowedEvents.has(event) || !allowedResults.has(result)) return;
  const key = `${event}\0${result}`;
  counters.set(key, (counters.get(key) ?? 0) + 1);
  const duration = durationSums.get(key) ?? { count: 0, sum: 0 };
  duration.count += 1;
  duration.sum += Math.max(0, durationSeconds);
  durationSums.set(key, duration);
}

const prometheusEscape = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");

export function renderMobileMetrics() {
  const lines = [
    "# HELP cookiebuild_funnel_events_total Aggregated Cookie Build product funnel events.",
    "# TYPE cookiebuild_funnel_events_total counter",
  ];
  for (const [key, count] of [...counters.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const [event, result] = key.split("\0");
    lines.push(`cookiebuild_funnel_events_total{event="${prometheusEscape(event!)}",source="mobile_api",result="${prometheusEscape(result!)}"} ${count}`);
  }
  lines.push(
    "# HELP cookiebuild_mobile_request_duration_seconds Aggregated mobile API request duration.",
    "# TYPE cookiebuild_mobile_request_duration_seconds summary",
  );
  for (const [key, duration] of [...durationSums.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const [event, result] = key.split("\0");
    const labels = `event="${prometheusEscape(event!)}",result="${prometheusEscape(result!)}"`;
    lines.push(`cookiebuild_mobile_request_duration_seconds_count{${labels}} ${duration.count}`);
    lines.push(`cookiebuild_mobile_request_duration_seconds_sum{${labels}} ${duration.sum.toFixed(6)}`);
  }
  return `${lines.join("\n")}\n`;
}

export function resetMobileMetricsForTests() {
  counters.clear();
  durationSums.clear();
}
