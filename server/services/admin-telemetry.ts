import { boundedResponseText } from "../utils/bounded-response";

const MAX_TELEMETRY_RESPONSE_BYTES = 2_097_152;

const REDACTIONS: Array<[RegExp, string]> = [
  [/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+\/-]+=*/gi, "[REDACTED_AUTH]"],
  [/(password|passwd|secret|token|api[_-]?key|webhook)\s*[=:]\s*[^\s,;]+/gi, "$1=[REDACTED]"],
  [/\b(?:postgres(?:ql)?|amqps?|redis):\/\/[^\s]+/gi, "[REDACTED_URL]"],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[REDACTED_IP]"],
  [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}(?:\.[A-Za-z0-9_-]{10,})?\b/g, "[REDACTED_TOKEN]"],
];

export function redactAdminTelemetry<T>(value: T): T {
  if (typeof value === "string") {
    let text: string = value;
    for (const [pattern, replacement] of REDACTIONS) text = text.replace(pattern, replacement);
    return text as T;
  }
  if (Array.isArray(value)) return value.map((item) => redactAdminTelemetry(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactAdminTelemetry(item)])) as T;
  }
  return value;
}

export const ADMIN_METRIC_QUERIES = {
  players_java: 'max(cookiebuild_monitor_online_players{edition="java"})',
  players_bedrock: 'max(cookiebuild_monitor_online_players{edition="bedrock"})',
  minecraft_mspt: "cookiebuild_minecraft_mspt",
  monitor_latency: "cookiebuild_monitor_check_latency_milliseconds",
  host_cpu_ratio: '1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))',
  host_memory_available: "node_memory_MemAvailable_bytes",
  host_memory_used_ratio: "1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes",
  host_disk_available_ratio:
    'node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}',
  host_disk_used_ratio:
    '1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}',
  funnel_24h:
    'sum(increase(cookiebuild_funnel_events_total{event=~"joined|player_data_ready|queue_joined|match_started|match_completed"}[24h])) by (event)',
  active_alerts: 'sum(ALERTS{alertstate="firing"})',
  update_available: "sum(cookiebuild_update_available)",
} as const;

export type AdminMetricKey = keyof typeof ADMIN_METRIC_QUERIES;

export const ADMIN_LOG_QUERIES = {
  recent: '{service="cookiebuild",component="minecraft"}',
  errors:
    '{service="cookiebuild",component="minecraft"} |~ "(?i)(error|exception|fatal|severe|failed)"',
  warnings: '{service="cookiebuild",component="minecraft"} |~ "(?i)(warn|warning)"',
  admin: '{service="cookiebuild",component="minecraft"} |= "COOKIEBUILD_ADMIN"',
} as const;

export type AdminLogKey = keyof typeof ADMIN_LOG_QUERIES;

function telemetryUrl(baseUrl: string, path: string) {
  const base = new URL(baseUrl);
  if (!/^https?:$/.test(base.protocol) || base.username || base.password) {
    throw new Error("Telemetry URL is invalid");
  }
  const url = new URL(path, base);
  if (url.origin !== base.origin) throw new Error("Telemetry origin mismatch");
  return url;
}

async function boundedJson<T>(url: URL, timeoutMs = 5_000): Promise<T> {
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(Math.min(Math.max(timeoutMs, 500), 15_000)),
    headers: { Accept: "application/json" },
  });
  const text = await boundedResponseText(
    response,
    MAX_TELEMETRY_RESPONSE_BYTES,
    "Telemetry response exceeded the size limit",
  );
  if (!response.ok) throw new Error(`Telemetry request failed with HTTP ${response.status}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Telemetry service returned invalid JSON");
  }
}

export function metricExpression(key: string) {
  if (!Object.hasOwn(ADMIN_METRIC_QUERIES, key)) throw new Error("Unsupported metric key");
  return ADMIN_METRIC_QUERIES[key as AdminMetricKey];
}

export function logExpression(key: string) {
  if (!Object.hasOwn(ADMIN_LOG_QUERIES, key)) throw new Error("Unsupported log key");
  return ADMIN_LOG_QUERIES[key as AdminLogKey];
}

export async function queryAdminMetric(input: {
  baseUrl: string;
  key: string;
  at?: Date;
}) {
  const url = telemetryUrl(input.baseUrl, "/api/v1/query");
  url.searchParams.set("query", metricExpression(input.key));
  if (input.at) url.searchParams.set("time", String(input.at.getTime() / 1_000));
  return redactAdminTelemetry(await boundedJson<Record<string, unknown>>(url));
}

export async function queryAdminLogs(input: {
  baseUrl: string;
  key: string;
  sinceMinutes?: number;
  limit?: number;
}) {
  const sinceMinutes = Math.min(Math.max(Math.trunc(input.sinceMinutes ?? 30), 1), 1_440);
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 200), 1), 500);
  const end = Date.now();
  const start = end - (sinceMinutes * 60_000);
  const url = telemetryUrl(input.baseUrl, "/loki/api/v1/query_range");
  url.searchParams.set("query", logExpression(input.key));
  url.searchParams.set("start", String(start * 1_000_000));
  url.searchParams.set("end", String(end * 1_000_000));
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("direction", "backward");
  return redactAdminTelemetry(await boundedJson<Record<string, unknown>>(url));
}
