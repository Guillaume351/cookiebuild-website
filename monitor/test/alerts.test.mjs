import assert from "node:assert/strict";
import test from "node:test";

import { AlertState } from "../src/alerts.mjs";

test("alerts once after consecutive failures and then on recovery", () => {
  const engine = new AlertState({ failureThreshold: 3, reminderMs: 10_000 });
  let state;
  let update = engine.update(state, { ok: false, error: "down" }, 1_000);
  state = update.state;
  assert.equal(update.action, null);
  update = engine.update(state, { ok: false, error: "down" }, 2_000);
  state = update.state;
  assert.equal(update.action, null);
  update = engine.update(state, { ok: false, error: "down" }, 3_000);
  state = update.state;
  assert.equal(update.action, "failed");
  update = engine.update(state, { ok: false, error: "down" }, 4_000);
  state = update.state;
  assert.equal(update.action, null);
  update = engine.update(state, { ok: true, latencyMs: 5 }, 5_000);
  assert.equal(update.action, "recovered");
});

test("sends a bounded reminder for a persistent outage", () => {
  const engine = new AlertState({ failureThreshold: 1, reminderMs: 10_000 });
  let update = engine.update({}, { ok: false, error: "down" }, 1_000);
  assert.equal(update.action, "failed");
  update = engine.update(update.state, { ok: false, error: "down" }, 10_999);
  assert.equal(update.action, null);
  update = engine.update(update.state, { ok: false, error: "down" }, 11_000);
  assert.equal(update.action, "failed");
});
