const RESULTS = new Set(["accepted", "rejected"]);
const SOURCES = new Set(["cookiedough", "geyser", "paper", "viaversion"]);
const EDITIONS = new Set(["bedrock", "java", "unknown"]);
const DIRECTIONS = new Set(["none", "too_old", "too_new", "unsupported"]);
const MAX_PROTOCOL_LABELS = 32;
const MAX_VERSION_LABELS = 64;

function stripFormatting(line) {
  return line
    .replace(/\x1b\[[0-9;]*m/g, "")
    .replace(/§[0-9A-FK-OR]/gi, "")
    .trim();
}

function field(line, name) {
  return line.match(new RegExp(`(?:^|\\s)${name}=([^\\s]+)`))?.[1];
}

function classifyRejection(line) {
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

function normalizeProtocol(raw) {
  return /^\d{1,5}$/.test(raw ?? "") && Number(raw) > 0 && Number(raw) <= 10_000
    ? raw
    : "unknown";
}

function normalizeVersion(raw) {
  if (/^\d+(?:\.\d+){0,3}$/.test(raw ?? "")) return raw;
  if (/^protocol-\d{1,5}$/.test(raw ?? "")) return raw;
  return "unknown";
}

function protocolFrom(line) {
  return normalizeProtocol(
    field(line, "protocol") ?? line.match(/\bprotocolVersion[=: ]+(\d{1,6})\b/i)?.[1],
  );
}

function versionFrom(line) {
  return normalizeVersion(field(line, "client_version") ?? field(line, "clientVersion"));
}

export function clientConnectionCounterKey(
  result,
  source,
  edition,
  direction,
  clientVersion = "unknown",
  protocol = "unknown",
) {
  return JSON.stringify([result, source, edition, direction, clientVersion, protocol]);
}

export function parseClientConnectionCounterKey(key) {
  const parsed = JSON.parse(key);
  if (!Array.isArray(parsed) || parsed.length !== 6) throw new Error("Invalid client connection counter key");
  const [result, source, edition, direction, clientVersion, protocol] = parsed.map(String);
  if (!RESULTS.has(result) || !SOURCES.has(source) || !EDITIONS.has(edition) || !DIRECTIONS.has(direction)) {
    throw new Error("Invalid client connection counter labels");
  }
  if (normalizeVersion(clientVersion) !== clientVersion && clientVersion !== "other") {
    throw new Error("Invalid client-version label");
  }
  if (normalizeProtocol(protocol) !== protocol && protocol !== "other") {
    throw new Error("Invalid client protocol label");
  }
  if ((result === "accepted") !== (direction === "none")) {
    throw new Error("Invalid client connection direction");
  }
  return [result, source, edition, direction, clientVersion, protocol];
}

function boundedLabel(value, counters, index, maximum) {
  if (value === "unknown") return value;
  const known = new Set();
  for (const key of Object.keys(counters)) {
    try {
      const existing = parseClientConnectionCounterKey(key)[index];
      if (existing !== "unknown" && existing !== "other") known.add(existing);
    } catch {
      // Ignore malformed persisted keys.
    }
  }
  return known.has(value) || known.size < maximum ? value : "other";
}

function increment(counters, labels) {
  const version = boundedLabel(labels.clientVersion, counters, 4, MAX_VERSION_LABELS);
  const protocol = boundedLabel(labels.protocol, counters, 5, MAX_PROTOCOL_LABELS);
  const key = clientConnectionCounterKey(
    labels.result,
    labels.source,
    labels.edition,
    labels.direction,
    version,
    protocol,
  );
  counters[key] = Math.max(0, Number(counters[key] ?? 0)) + 1;
}

/** Count bounded operational labels only; never retain the source line, IP or player name. */
export function recordClientConnections(text, counters = {}) {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripFormatting(rawLine);
    if (!line) continue;

    if (line.includes("[funnel]") && field(line, "event") === "joined") {
      const rawEdition = field(line, "edition");
      increment(counters, {
        result: "accepted",
        source: "cookiedough",
        edition: EDITIONS.has(rawEdition) ? rawEdition : "unknown",
        direction: "none",
        clientVersion: versionFrom(line),
        protocol: protocolFrom(line),
      });
      continue;
    }

    const rejection = classifyRejection(line);
    if (!rejection) continue;
    increment(counters, {
      result: "rejected",
      ...rejection,
      clientVersion: versionFrom(line),
      protocol: protocolFrom(line),
    });
  }
  return counters;
}
