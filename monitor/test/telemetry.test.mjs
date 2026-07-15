import assert from "node:assert/strict";
import test from "node:test";

import {
  funnelCounterKey,
  parseFunnelCounterKey,
  recordFunnelTelemetry,
} from "../src/telemetry.mjs";

test("counts bounded funnel dimensions without player identifiers", () => {
  const counters = {};
  const result = recordFunnelTelemetry([
    "[CookieDough] [funnel] event=joined player=private edition=bedrock protocol=827 mspt=4.25",
    "[CookieDough] [funnel] event=queue_joined player=private edition=bedrock game=MicroBattles players=1",
    "[CookieDough] [funnel] event=match_started player=private edition=java game=SkyWars players=8",
    "[CookieDough] [funnel] event=queue_joined player=private edition=java game=BuildBattles players=3",
    "[CookieDough] [funnel] event=match_completed player=private edition=bedrock game=TurfWars players=6",
    "[CookieDough] [funnel] event=unknown player=private edition=bedrock game=user-controlled",
  ].join("\n"), counters);

  assert.equal(result.counters[funnelCounterKey("joined", "bedrock", "none")], 1);
  assert.equal(result.counters[funnelCounterKey("queue_joined", "bedrock", "MicroBattles")], 1);
  assert.equal(result.counters[funnelCounterKey("match_started", "java", "SkyWars")], 1);
  assert.equal(result.counters[funnelCounterKey("queue_joined", "java", "BuildBattles")], 1);
  assert.equal(result.counters[funnelCounterKey("match_completed", "bedrock", "TurfWars")], 1);
  assert.equal(Object.keys(result.counters).length, 5);
  assert.equal(result.latestMspt, 4.25);
  assert.deepEqual(parseFunnelCounterKey(Object.keys(result.counters)[0]), ["joined", "bedrock", "none"]);
});

test("uses bounded fallback labels for context-free server events", () => {
  const result = recordFunnelTelemetry(
    "[CookieDough] [funnel] event=kit_purchased player=private minigame=Anything kit=Anything",
  );
  assert.equal(result.counters[funnelCounterKey("kit_purchased", "unknown", "none")], 1);
});

test("records bounded core tick-delay diagnostics", () => {
  const result = recordFunnelTelemetry([
    "[CookieDough] [performance] event=server_tick_delay delay_ms=4635",
    "[CookieDough] [performance] event=slow_game_tick game=SkyWars state=OPEN elapsed_ms=245",
    "[CookieDough] [performance] event=slow_game_tick game=user-input state=OPEN elapsed_ms=9999",
  ].join("\n"));

  assert.equal(result.latestServerTickDelayMillis, 4635);
  assert.deepEqual(result.latestSlowGameTick, { game: "SkyWars", elapsedMillis: 245 });
});
