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
    "[CookieDough] [funnel] event=unknown player=private edition=bedrock game=user-controlled",
  ].join("\n"), counters);

  assert.equal(result.counters[funnelCounterKey("joined", "bedrock", "none")], 1);
  assert.equal(result.counters[funnelCounterKey("queue_joined", "bedrock", "MicroBattles")], 1);
  assert.equal(Object.keys(result.counters).length, 2);
  assert.equal(result.latestMspt, 4.25);
  assert.deepEqual(parseFunnelCounterKey(Object.keys(result.counters)[0]), ["joined", "bedrock", "none"]);
});

test("uses bounded fallback labels for context-free server events", () => {
  const result = recordFunnelTelemetry(
    "[CookieDough] [funnel] event=kit_purchased player=private minigame=Anything kit=Anything",
  );
  assert.equal(result.counters[funnelCounterKey("kit_purchased", "unknown", "none")], 1);
});
