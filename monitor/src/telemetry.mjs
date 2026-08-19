const FUNNEL_EVENTS = new Set([
  "joined", "lobby_ready", "player_data_ready", "selector_opened", "queue_joined", "queue_left",
  "match_started", "match_completed", "rematch_clicked", "disconnected", "kicked",
  "tutorial_started", "tutorial_completed", "reward_claimed", "kit_selected", "kit_purchased",
  "npc_selected", "feedback",
]);

const EDITIONS = new Set(["java", "bedrock"]);
const GAMES = new Set(["MicroBattles", "Pitchout", "SkyWars", "BuildBattles", "TurfWars", "BedWars"]);

function field(line, name) {
  return line.match(new RegExp(`(?:^|\\s)${name}=([^\\s]+)`))?.[1];
}

export function funnelCounterKey(event, edition, game) {
  return JSON.stringify([event, edition, game]);
}

export function parseFunnelCounterKey(key) {
  const parsed = JSON.parse(key);
  if (!Array.isArray(parsed) || parsed.length !== 3) throw new Error("Invalid funnel counter key");
  return parsed;
}

export function recordFunnelTelemetry(text, counters = {}) {
  let latestMspt = null;
  let latestServerTickDelayMillis = null;
  let latestSlowGameTick = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.includes("[performance]")) {
      const event = field(line, "event");
      if (event === "server_tick_delay") {
        const delay = Number(field(line, "delay_ms"));
        if (Number.isFinite(delay) && delay >= 0 && delay < 60_000) {
          latestServerTickDelayMillis = delay;
        }
      } else if (event === "slow_game_tick") {
        const elapsed = Number(field(line, "elapsed_ms"));
        const game = field(line, "game");
        if (GAMES.has(game) && Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 60_000) {
          latestSlowGameTick = { game, elapsedMillis: elapsed };
        }
      }
    }
    if (!line.includes("[funnel]")) continue;
    const event = field(line, "event");
    if (!FUNNEL_EVENTS.has(event)) continue;

    const rawEdition = field(line, "edition");
    const rawGame = field(line, "game");
    const edition = EDITIONS.has(rawEdition) ? rawEdition : "unknown";
    const game = GAMES.has(rawGame) ? rawGame : "none";
    const key = funnelCounterKey(event, edition, game);
    counters[key] = Math.max(0, Number(counters[key] ?? 0)) + 1;

    const mspt = Number(field(line, "mspt"));
    if (Number.isFinite(mspt) && mspt >= 0 && mspt < 60_000) latestMspt = mspt;
  }
  return { counters, latestMspt, latestServerTickDelayMillis, latestSlowGameTick };
}
