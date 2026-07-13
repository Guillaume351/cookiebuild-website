import http from "node:http";
import { mkdir, readFile, rename, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";

import { AlertState, sendDiscord } from "./alerts.mjs";
import { checkBedrock, checkDatabaseApi, checkJava, checkWebsite } from "./checks.mjs";
import { readNewLogChunk, selectNewFatalLines } from "./logs.mjs";

const config = {
  host: process.env.MINECRAFT_HOST || "play.cookie-build.com",
  javaPort: numberEnv("MINECRAFT_JAVA_PORT", 25565),
  bedrockPort: numberEnv("MINECRAFT_BEDROCK_PORT", 19132),
  websiteUrl: process.env.WEBSITE_URL || "https://www.cookie-build.com",
  intervalMs: numberEnv("MONITOR_INTERVAL_SECONDS", 60) * 1_000,
  failureThreshold: numberEnv("MONITOR_FAILURE_THRESHOLD", 3),
  reminderMs: numberEnv("MONITOR_REMINDER_HOURS", 6) * 60 * 60 * 1_000,
  startupGraceMs: numberEnv("MONITOR_STARTUP_GRACE_SECONDS", 120) * 1_000,
  stateFile: process.env.MONITOR_STATE_FILE || "/state/monitor.json",
  maintenanceFile: process.env.MONITOR_MAINTENANCE_FILE || "/state/maintenance",
  logFile: process.env.MINECRAFT_LOG_FILE || "/minecraft-logs/latest.log",
  httpPort: numberEnv("PORT", 8080),
  webhook: process.env.DISCORD_ALERT_WEBHOOK_URL
    || process.env.DISCORD_MODERATION_WEBHOOK_URL
    || process.env.DISCORD_PLAYER_STATUS_WEBHOOK_URL
    || "",
  alertMention: process.env.DISCORD_ALERT_MENTION || "",
};

const engine = new AlertState(config);
const startedAt = Date.now();
let running = false;
let state = await loadState(config.stateFile);
state.checks ||= {};
state.logFingerprints ||= {};
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
      scanLogs(),
    ]);
    await saveState();
  } catch (error) {
    console.error(`[monitor cycle failure] ${safeError(error)}`);
  } finally {
    running = false;
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
  return `${lines.join("\n")}\n`;
}

http.createServer((request, response) => {
  if (request.url === "/metrics") {
    response.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
    response.end(prometheusMetrics());
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
  console.log(config.webhook ? "Discord alert webhook configured" : "No Discord alert webhook configured");
});

await runCycle();
setInterval(runCycle, config.intervalMs).unref();
