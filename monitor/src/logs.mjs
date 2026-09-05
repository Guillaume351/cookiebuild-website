import { createHash } from "node:crypto";
import { open, stat } from "node:fs/promises";

const FATAL_PATTERNS = [
  /\[(?:CookieDough|MicroBattles|Pitchout|SkyWars|BuildBattles|TurfWars|BedWars)\].*(?:failed|failure|fatal|exception|could not)/i,
  /Failed to load map for (?:MicroBattles|Pitchout|SkyWars|BuildBattles|TurfWars|BedWars)/i,
  /Could not pass event .* to (?:CookieDough|MicroBattles|Pitchout|SkyWars|BuildBattles|TurfWars|BedWars)/i,
  /Error occurred while enabling (?:CookieDough|MicroBattles|Pitchout|SkyWars|BuildBattles|TurfWars|BedWars)/i,
  /Exception in server tick loop/i,
  /Encountered an unexpected exception/i,
  /OutOfMemoryError/i,
  /A single server tick took/i,
  /The server has stopped responding/i,
  /FAILED TO BIND TO PORT/i,
];

const IGNORED_PATTERNS = [
  /Failed to verify username/i,
  /tried to join with an invalid session/i,
  /has not yet been tested.*Proceed with caution/i,
  /\[(?:SkyWars|BuildBattles|TurfWars)\].*(?:remains )?unavailable until a valid map archive is installed/i,
];

export function isFatalLogLine(line) {
  if (IGNORED_PATTERNS.some((pattern) => pattern.test(line))) return false;
  if (/\/(?:ERROR|FATAL|SEVERE)\]:/.test(line) && /Server thread/.test(line)) return true;
  return FATAL_PATTERNS.some((pattern) => pattern.test(line));
}

export function logFingerprint(line) {
  const normalized = line
    .replace(/^\[[^\]]+\]\s*/, "")
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "<uuid>")
    .replace(/\b\d{2,}\b/g, "<n>")
    .trim();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

export function selectNewFatalEvents(text, fingerprints = {}, now = Date.now(), dedupeMs = 6 * 60 * 60 * 1_000) {
  const alerts = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\x1b\[[0-9;]*m/g, "").trim();
    if (!line || !isFatalLogLine(line)) continue;
    const fingerprint = logFingerprint(line);
    if (fingerprints[fingerprint] != null
      && now - Number(fingerprints[fingerprint]) < dedupeMs) continue;
    fingerprints[fingerprint] = now;
    alerts.push({ fingerprint, line: line.slice(0, 500) });
  }
  for (const [fingerprint, seenAt] of Object.entries(fingerprints)) {
    if (now - Number(seenAt) > dedupeMs * 2) delete fingerprints[fingerprint];
  }
  return alerts;
}

export function selectNewFatalLines(text, fingerprints = {}, now = Date.now(), dedupeMs) {
  return selectNewFatalEvents(text, fingerprints, now, dedupeMs).map(({ line }) => line);
}

// Pending incidents survive restarts; only successful delivery starts the cooldown.
export function enqueueFatalAlerts(state, text, now = Date.now()) {
  state.pendingFatalAlerts ||= [];
  state.logFingerprints ||= {};
  const seen = { ...state.logFingerprints };
  for (const { fingerprint } of state.pendingFatalAlerts) seen[fingerprint] = now;
  state.pendingFatalAlerts.push(...selectNewFatalEvents(text, seen, now));
  for (const [fingerprint, deliveredAt] of Object.entries(state.logFingerprints)) {
    if (now - Number(deliveredAt) > 12 * 60 * 60 * 1_000) delete state.logFingerprints[fingerprint];
  }
}

export async function deliverPendingFatalAlerts(state, notify, save, now = () => Date.now()) {
  const batch = [];
  let length = 0;
  for (const event of state.pendingFatalAlerts || []) {
    // Leave room for the heading and configured mention before Discord truncation.
    if (batch.length === 5 || length + event.line.length + 3 > 1_500) break;
    batch.push(event);
    length += event.line.length + 3;
  }
  if (batch.length === 0) return;
  // Persist the pending incidents together with the consumed log offset first.
  await save();
  const lines = batch.map(({ line }) => `• ${line}`).join("\n");
  if (!await notify(`🔥 **Cookie Build fatal game/server log**\n${lines}`)) return;
  for (const { fingerprint } of batch) state.logFingerprints[fingerprint] = now();
  state.pendingFatalAlerts.splice(0, batch.length);
  await save();
}

export async function readNewLogChunk(filePath, previousOffset, initialBytes = 512 * 1_024) {
  const metadata = await stat(filePath);
  const offset = previousOffset == null
    ? Math.max(0, metadata.size - initialBytes)
    : previousOffset > metadata.size ? 0 : previousOffset;
  if (metadata.size === offset) return { text: "", offset: metadata.size };
  const length = metadata.size - offset;
  const buffer = Buffer.alloc(length);
  const file = await open(filePath, "r");
  try {
    await file.read(buffer, 0, length, offset);
  } finally {
    await file.close();
  }
  return { text: buffer.toString("utf8"), offset: metadata.size };
}
