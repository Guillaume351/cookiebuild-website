const SOURCES = new Set(["geyser", "paper", "viaversion"]);
const EDITIONS = new Set(["bedrock", "java"]);
const DIRECTIONS = new Set(["too_old", "too_new", "unsupported"]);
const MAX_PROTOCOL_LABELS = 32;

function stripFormatting(line) {
  return line
    .replace(/\x1b\[[0-9;]*m/g, "")
    .replace(/§[0-9A-FK-OR]/gi, "")
    .trim();
}

function classify(line) {
  if (/Outdated Bedrock client!|Client Bedrock obsolète !/i.test(line)) {
    return { source: "geyser", edition: "bedrock", direction: "too_old" };
  }
  if (/Outdated Geyser proxy!|Proxy Geyser obsolète !/i.test(line)) {
    return { source: "geyser", edition: "bedrock", direction: "too_new" };
  }

  const geyser = /\[Geyser-(?:Spigot|Velocity|BungeeCord)\]/i.test(line);
  if (/Outdated client!/i.test(line)) {
    return geyser
      ? { source: "geyser", edition: "bedrock", direction: "too_old" }
      : { source: "paper", edition: "java", direction: "too_old" };
  }
  if (/Outdated server!/i.test(line)) {
    return geyser
      ? { source: "geyser", edition: "bedrock", direction: "too_new" }
      : { source: "paper", edition: "java", direction: "too_new" };
  }
  if (/This server is (?:running an )?outdated version/i.test(line)) {
    return { source: "viaversion", edition: "java", direction: "too_new" };
  }
  if (/You are using an unsupported Minecraft version/i.test(line)) {
    return { source: "viaversion", edition: "java", direction: "unsupported" };
  }
  return null;
}

function protocolFrom(line) {
  const value = Number(line.match(/\bprotocol(?:Version)?[=: ]+(\d{1,6})\b/i)?.[1]);
  return Number.isInteger(value) && value > 0 && value <= 10_000 ? String(value) : "unknown";
}

export function clientVersionCounterKey(source, edition, direction, protocol = "unknown") {
  return JSON.stringify([source, edition, direction, protocol]);
}

export function parseClientVersionCounterKey(key) {
  const parsed = JSON.parse(key);
  if (!Array.isArray(parsed) || parsed.length !== 4) throw new Error("Invalid client-version counter key");
  const [source, edition, direction, protocol] = parsed.map(String);
  if (!SOURCES.has(source) || !EDITIONS.has(edition) || !DIRECTIONS.has(direction)) {
    throw new Error("Invalid client-version counter labels");
  }
  if (protocol !== "unknown" && protocol !== "other" && !/^\d{1,5}$/.test(protocol)) {
    throw new Error("Invalid client-version protocol label");
  }
  return [source, edition, direction, protocol];
}

function boundedProtocol(line, counters) {
  const protocol = protocolFrom(line);
  if (protocol === "unknown") return protocol;
  const known = new Set();
  for (const key of Object.keys(counters)) {
    try {
      const existing = parseClientVersionCounterKey(key)[3];
      if (existing !== "unknown" && existing !== "other") known.add(existing);
    } catch {
      // Ignore malformed persisted keys.
    }
  }
  return known.has(protocol) || known.size < MAX_PROTOCOL_LABELS ? protocol : "other";
}

/** Count bounded operational labels only; never retain the source line, IP or player name. */
export function recordClientVersionRejections(text, counters = {}) {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripFormatting(rawLine);
    if (!line) continue;
    const match = classify(line);
    if (!match) continue;
    const protocol = boundedProtocol(line, counters);
    const key = clientVersionCounterKey(match.source, match.edition, match.direction, protocol);
    counters[key] = Math.max(0, Number(counters[key] ?? 0)) + 1;
  }
  return counters;
}
