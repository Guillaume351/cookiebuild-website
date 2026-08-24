import http from "node:http";
import { mkdir, readFile, rename, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";

import { AlertState, sendDiscord } from "./alerts.mjs";
import { checkBedrock, checkDatabaseApi, checkJava, checkWebsite } from "./checks.mjs";
import { parseClientConnectionCounterKey, recordClientConnections } from "./client-versions.mjs";
import { readNewLogChunk, selectNewFatalLines } from "./logs.mjs";
import { parseFunnelCounterKey, recordFunnelTelemetry } from "./telemetry.mjs";
import { loadAlertWebhook } from "./webhook.mjs";

const alertWebhook = await loadAlertWebhook(process.env);

const config = {
  host: process.env.MINECRAFT_HOST || "play.cookie-build.com",
  javaPort: numberEnv("MINECRAFT_JAVA_PORT", 25565),
  bedrockPort: numberEnv("MINECRAFT_BEDROCK_PORT", 19132),
  websiteUrl: process.env.WEBSITE_URL || "https://www.cookie-build.com",
  intervalMs: numberEnv("MONITOR_INTERVAL_SECONDS", 60) * 1_000,
  logIntervalMs: numberEnv("MONITOR_LOG_INTERVAL_SECONDS", 10) * 1_000,
  failureThreshold: numberEnv("MONITOR_FAILURE_THRESHOLD", 3),
  reminderMs: numberEnv("MONITOR_REMINDER_HOURS", 6) * 60 * 60 * 1_000,
  startupGraceMs: numberEnv("MONITOR_STARTUP_GRACE_SECONDS", 120) * 1_000,
  stateFile: process.env.MONITOR_STATE_FILE || "/state/monitor.json",
  maintenanceFile: process.env.MONITOR_MAINTENANCE_FILE || "/state/maintenance",
  logFile: process.env.MINECRAFT_LOG_FILE || "/minecraft-logs/latest.log",
  httpPort: numberEnv("PORT", 8080),
  // Never fall back to the player-status webhook: that endpoint intentionally
  // feeds Discord join logs and would mix operator incidents with player joins.
  webhook: alertWebhook.value,
  webhookSource: alertWebhook.source,
  alertMention: process.env.DISCORD_ALERT_MENTION || "",
};

const engine = new AlertState(config);
const startedAt = Date.now();
let running = false;
let logRunning = false;
let state = await loadState(config.stateFile);
state.checks ||= {};
state.logFingerprints ||= {};
state.funnelCounters ||= {};
state.clientVersionConnections ||= {};
state.queueStates ||= {};
state.alertsSent ||= 0;

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function loadState(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return {};
  }
}

async function saveState() {
  await mkdir(dirname(config.stateFile), { recursive: true });
  const temporary = `${config.stateFile}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temporary, config.stateFile);
}

let saveChain = Promise.resolve();

function queueStateSave() {
  saveChain = saveChain.then(saveState, saveState);
  return saveChain;
}

function safeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/https:\/\/[^\s@]+@/g, "https://<redacted>@").slice(0, 300);
}

async function runCheck(name, check) {
  let result;
  try {
    result = await check();
  } catch (error) {
    result = { ok: false, error: safeError(error) };
  }
  const update = engine.update(state.checks[name], result);
  state.checks[name] = update.state;
  if (update.action) {
    const icon = update.action === "recovered" ? "✅" : "🚨";
    const detail = update.action === "recovered"
      ? `recovered after ${state.checks[name].details.latencyMs ?? "?"} ms`
      : `failed ${state.checks[name].failures} consecutive checks: ${state.checks[name].lastError}`;
    const delivered = await notify(`${icon} **Cookie Build ${name}** ${detail}`);
    if (!delivered) {
      state.checks[name].alertedDown = false;
      state.checks[name].lastAlertAt = null;
    }
  }
  return result;
}

async function inMaintenance() {
  try {
    await access(config.maintenanceFile);
    return true;
  } catch {
    return false;
  }
}

async function notify(message) {
  if (state.maintenance || Date.now() - startedAt < config.startupGraceMs) {
    console.warn(`[alert suppressed] ${message}`);
    return false;
  }
  const content = `${config.alertMention ? `${config.alertMention} ` : ""}${message}`;
  if (!config.webhook) {
    console.error(`[alert without webhook] ${content}`);
    return true;
  }
  try {
    await sendDiscord(config.webhook, content);
    state.alertsSent += 1;
    return true;
  } catch (error) {
    console.error(`[webhook failure] ${safeError(error)}`);
    return false;
  }
}

async function scanLogs() {
  try {
    if (Date.now() - startedAt < config.startupGraceMs) return;
    const chunk = await readNewLogChunk(config.logFile, state.logOffset);
    state.logOffset = chunk.offset;
    const telemetry = recordFunnelTelemetry(chunk.text, state.funnelCounters, state.queueStates);
    state.funnelCounters = telemetry.counters;
    state.queueStates = telemetry.queueStates;
    state.clientVersionConnections = recordClientConnections(
      chunk.text,
      state.clientVersionConnections,
    );
    if (telemetry.latestMspt != null) {
      state.latestMspt = telemetry.latestMspt;
      state.latestMsptObservedAt = Date.now();
    }
    if (telemetry.latestServerTickDelayMillis != null) {
      state.latestServerTickDelayMillis = telemetry.latestServerTickDelayMillis;
      state.latestServerTickDelayObservedAt = Date.now();
    }
    if (telemetry.latestSlowGameTick != null) {
      state.latestSlowGameTick = telemetry.latestSlowGameTick;
      state.latestSlowGameTickObservedAt = Date.now();
    }
    if (state.maintenance) return;
    const fatalLines = selectNewFatalLines(chunk.text, state.logFingerprints);
    if (fatalLines.length > 0) {
      const lines = fatalLines.slice(0, 5).map((line) => `• ${line}`).join("\n");
      const extra = fatalLines.length > 5 ? `\n• …and ${fatalLines.length - 5} more` : "";
      await notify(`🔥 **Cookie Build fatal game/server log**\n${lines}${extra}`);
    }
  } catch (error) {
    console.warn(`[log scan unavailable] ${safeError(error)}`);
  }
}

async function runCycle() {
  if (running) return;
  running = true;
  state.maintenance = await inMaintenance();
  state.lastRunAt = Date.now();
  try {
    await Promise.all([
      runCheck("Java server", () => checkJava({ host: config.host, port: config.javaPort })),
      runCheck("Bedrock server", () => checkBedrock({ host: config.host, port: config.bedrockPort })),
      runCheck("website", () => checkWebsite({ baseUrl: config.websiteUrl })),
      runCheck("database API", () => checkDatabaseApi({ baseUrl: config.websiteUrl })),
    ]);
    await queueStateSave();
  } catch (error) {
    console.error(`[monitor cycle failure] ${safeError(error)}`);
  } finally {
    running = false;
  }
}

async function runLogCycle() {
  if (logRunning) return;
  logRunning = true;
  try {
    state.maintenance = await inMaintenance();
    await scanLogs();
    await queueStateSave();
  } catch (error) {
    console.error(`[monitor log cycle failure] ${safeError(error)}`);
  } finally {
    logRunning = false;
  }
}

function publicStatus() {
  const checks = Object.fromEntries(Object.entries(state.checks).map(([name, value]) => [name, {
    status: value.status,
    failures: value.failures,
    changedAt: value.changedAt ? new Date(value.changedAt).toISOString() : null,
    lastSuccessAt: value.lastSuccessAt ? new Date(value.lastSuccessAt).toISOString() : null,
    error: value.lastError,
    details: value.details,
  }]));
  return {
    ok: Object.values(checks).every((check) => check.status !== "unhealthy"),
    maintenance: Boolean(state.maintenance),
    lastRunAt: state.lastRunAt ? new Date(state.lastRunAt).toISOString() : null,
    checks,
  };
}

function prometheusMetrics() {
  const lines = [
    "# HELP cookiebuild_monitor_check_up Whether the latest check succeeded.",
    "# TYPE cookiebuild_monitor_check_up gauge",
  ];
  for (const [name, check] of Object.entries(state.checks)) {
    const label = name.replaceAll('"', '\\"');
    lines.push(`cookiebuild_monitor_check_up{check="${label}"} ${check.details?.ok ? 1 : 0}`);
    lines.push(`cookiebuild_monitor_check_failures{check="${label}"} ${Number(check.failures ?? 0)}`);
    if (Number.isFinite(check.details?.latencyMs)) {
      lines.push(`cookiebuild_monitor_check_latency_milliseconds{check="${label}"} ${check.details.latencyMs}`);
    }
    if (Number.isFinite(check.details?.players)) {
      lines.push(`cookiebuild_monitor_online_players{edition="${name.startsWith("Bedrock") ? "bedrock" : "java"}"} ${check.details.players}`);
    }
  }
  lines.push(`cookiebuild_monitor_alerts_sent_total ${Number(state.alertsSent ?? 0)}`);
  lines.push(`cookiebuild_monitor_maintenance ${state.maintenance ? 1 : 0}`);
  lines.push(`cookiebuild_monitor_last_run_timestamp_seconds ${Math.floor(Number(state.lastRunAt ?? 0) / 1_000)}`);
  lines.push("# HELP cookiebuild_funnel_events_total Aggregate Cookie Build funnel events parsed from structured logs.");
  lines.push("# TYPE cookiebuild_funnel_events_total counter");
  for (const [key, value] of Object.entries(state.funnelCounters)) {
    try {
      const [event, edition, game] = parseFunnelCounterKey(key).map((label) => String(label).replaceAll('"', '\\"'));
      lines.push(`cookiebuild_funnel_events_total{event="${event}",edition="${edition}",game="${game}"} ${Math.max(0, Number(value) || 0)}`);
    } catch {
      // Ignore malformed persisted keys rather than breaking the metrics endpoint.
    }
  }
  lines.push("# HELP cookiebuild_client_version_connections_total Accepted or version-rejected client connections. Labels are bounded and contain no client identity.");
  lines.push("# TYPE cookiebuild_client_version_connections_total counter");
  const clientVersionSeries = new Map(Object.entries(state.clientVersionConnections));
  for (const [result, source, edition, direction] of [
    ["accepted", "cookiedough", "bedrock", "none"],
    ["accepted", "cookiedough", "java", "none"],
    ["rejected", "geyser", "bedrock", "too_old"],
    ["rejected", "geyser", "bedrock", "too_new"],
    ["rejected", "paper", "java", "too_old"],
    ["rejected", "paper", "java", "too_new"],
    ["rejected", "viaversion", "java", "unsupported"],
  ]) {
    const key = JSON.stringify([result, source, edition, direction, "unknown", "unknown"]);
    if (!clientVersionSeries.has(key)) clientVersionSeries.set(key, 0);
  }
  for (const [key, value] of clientVersionSeries) {
    try {
      const [result, source, edition, direction, clientVersion, protocol] = parseClientConnectionCounterKey(key)
        .map((label) => String(label).replaceAll('"', '\\"'));
      lines.push(`cookiebuild_client_version_connections_total{result="${result}",source="${source}",edition="${edition}",direction="${direction}",client_version="${clientVersion}",protocol="${protocol}"} ${Math.max(0, Number(value) || 0)}`);
    } catch {
      // Ignore malformed persisted keys rather than breaking the metrics endpoint.
    }
  }
  lines.push("# HELP cookiebuild_queue_eligible_players Current eligible players in an open queue.");
  lines.push("# TYPE cookiebuild_queue_eligible_players gauge");
  lines.push("# HELP cookiebuild_queue_minimum_players Current real minimum player threshold for a queue.");
  lines.push("# TYPE cookiebuild_queue_minimum_players gauge");
  lines.push("# HELP cookiebuild_queue_ready_to_start Whether current headcount and mode-specific composition allow countdown.");
  lines.push("# TYPE cookiebuild_queue_ready_to_start gauge");
  lines.push("# HELP cookiebuild_queue_oldest_wait_seconds Current oldest wait in an open queue.");
  lines.push("# TYPE cookiebuild_queue_oldest_wait_seconds gauge");
  lines.push("# HELP cookiebuild_queue_state_observed_timestamp_seconds Unix timestamp of the latest queue snapshot.");
  lines.push("# TYPE cookiebuild_queue_state_observed_timestamp_seconds gauge");
  for (const [game, queue] of Object.entries(state.queueStates)) {
    const label = String(game).replaceAll('"', '\\"');
    lines.push(`cookiebuild_queue_eligible_players{game="${label}"} ${Number(queue.eligiblePlayers)}`);
    lines.push(`cookiebuild_queue_minimum_players{game="${label}"} ${Number(queue.minimumPlayers)}`);
    lines.push(`cookiebuild_queue_ready_to_start{game="${label}"} ${queue.readyToStart ? 1 : 0}`);
    lines.push(`cookiebuild_queue_oldest_wait_seconds{game="${label}"} ${Number(queue.oldestWaitSeconds)}`);
    lines.push(`cookiebuild_queue_state_observed_timestamp_seconds{game="${label}"} ${Math.floor(Number(queue.observedAt) / 1_000)}`);
  }
  if (Number.isFinite(state.latestMspt)) {
    lines.push("# HELP cookiebuild_minecraft_mspt Latest average milliseconds per tick observed in funnel telemetry.");
    lines.push("# TYPE cookiebuild_minecraft_mspt gauge");
    lines.push(`cookiebuild_minecraft_mspt ${state.latestMspt}`);
  }
  if (Number.isFinite(state.latestMsptObservedAt)) {
    lines.push("# HELP cookiebuild_minecraft_mspt_observed_timestamp_seconds Unix timestamp of the latest MSPT observation.");
    lines.push("# TYPE cookiebuild_minecraft_mspt_observed_timestamp_seconds gauge");
    lines.push(`cookiebuild_minecraft_mspt_observed_timestamp_seconds ${Math.floor(state.latestMsptObservedAt / 1000)}`);
  }
  if (Number.isFinite(state.latestServerTickDelayMillis)) {
    lines.push("# HELP cookiebuild_minecraft_server_tick_delay_milliseconds Latest main-thread scheduling delay detected by CookieDough.");
    lines.push("# TYPE cookiebuild_minecraft_server_tick_delay_milliseconds gauge");
    lines.push(`cookiebuild_minecraft_server_tick_delay_milliseconds ${state.latestServerTickDelayMillis}`);
  }
  if (Number.isFinite(state.latestServerTickDelayObservedAt)) {
    lines.push(`cookiebuild_minecraft_server_tick_delay_observed_timestamp_seconds ${Math.floor(state.latestServerTickDelayObservedAt / 1_000)}`);
  }
  if (state.latestSlowGameTick && Number.isFinite(state.latestSlowGameTick.elapsedMillis)) {
    const game = String(state.latestSlowGameTick.game).replaceAll('"', '\\"');
    lines.push("# HELP cookiebuild_minecraft_slow_game_tick_milliseconds Latest slow minigame tick duration.");
    lines.push("# TYPE cookiebuild_minecraft_slow_game_tick_milliseconds gauge");
    lines.push(`cookiebuild_minecraft_slow_game_tick_milliseconds{game="${game}"} ${state.latestSlowGameTick.elapsedMillis}`);
  }
  return `${lines.join("\n")}\n`;
}

http.createServer((request, response) => {
  if (request.url === "/metrics") {
    response.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
    response.end(prometheusMetrics());
    return;
  }
  if (request.url === "/livez") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }
  if (request.url === "/healthz") {
    const status = publicStatus();
    response.writeHead(status.ok ? 200 : 503, { "content-type": "application/json" });
    response.end(JSON.stringify(status));
    return;
  }
  response.writeHead(404).end();
}).listen(config.httpPort, "0.0.0.0", () => {
  console.log(`Cookie Build monitor listening on :${config.httpPort}`);
  console.log(config.webhook
    ? `Discord alert webhook configured via ${config.webhookSource}`
    : "No dedicated Discord alert webhook configured");
});

await Promise.all([runCycle(), runLogCycle()]);
setInterval(runCycle, config.intervalMs).unref();
setInterval(runLogCycle, config.logIntervalMs).unref();
