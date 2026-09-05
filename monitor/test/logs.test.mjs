import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { deliverPendingFatalAlerts, enqueueFatalAlerts, isFatalLogLine, readNewLogChunk, selectNewFatalLines } from "../src/logs.mjs";

test("detects game and Paper fatal errors without authentication noise", () => {
  assert.equal(isFatalLogLine("[Server thread/ERROR]: [MicroBattles] Failed to load map for MicroBattlesGame: bad zip"), true);
  assert.equal(isFatalLogLine("[Server thread/ERROR]: Could not pass event PlayerMoveEvent to Pitchout"), true);
  assert.equal(isFatalLogLine("[Server thread/ERROR]: [SkyWars] Failed to load map for SkyWarsGame: missing archive"), true);
  assert.equal(isFatalLogLine("[Server thread/ERROR]: Could not pass event PlayerInteractEvent to BuildBattles"), true);
  assert.equal(isFatalLogLine("[Server thread/ERROR]: [TurfWars] Failed to load map for TurfWarsGame: corrupt archive"), true);
  assert.equal(isFatalLogLine("[Server thread/WARN]: [BuildBattles] BuildBattles unavailable until a valid map archive is installed: BuildBattles preparation failed: missing archive"), false);
  assert.equal(isFatalLogLine("[Server thread/WARN]: [SkyWars] SkyWars remains unavailable until a valid map archive is installed: SkyWars map preparation failed: missing archive"), false);
  assert.equal(isFatalLogLine("[Server thread/WARN]: [TurfWars] TurfWars remains unavailable until a valid map archive is installed: TurfWars map preparation failed: missing archive"), false);
  assert.equal(isFatalLogLine("[User Authenticator #1/ERROR]: Username 'bot' tried to join with an invalid session"), false);
  assert.equal(isFatalLogLine("[Server thread/WARN]: [ProtocolLib] Version has not yet been tested! Proceed with caution."), false);
});

test("deduplicates equivalent fatal log lines during the cooldown", () => {
  const fingerprints = {};
  const first = selectNewFatalLines("[12:00:00] [Server thread/ERROR]: [MicroBattles] Failed to load map for MicroBattlesGame: x", fingerprints, 1_000, 10_000);
  const duplicate = selectNewFatalLines("[12:00:01] [Server thread/ERROR]: [MicroBattles] Failed to load map for MicroBattlesGame: x", fingerprints, 2_000, 10_000);
  assert.equal(first.length, 1);
  assert.equal(duplicate.length, 0);
});

test("reads a rotated log from the beginning when the saved offset is beyond its size", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cookiebuild-monitor-"));
  const file = join(directory, "latest.log");
  try {
    await writeFile(file, "new log\n", "utf8");
    const result = await readNewLogChunk(file, 10_000);
    assert.equal(result.text, "new log\n");
    assert.equal(result.offset, 8);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

const fatalLine = "[Server thread/ERROR]: [MicroBattles] Failed to load map for MicroBattlesGame: bad zip";

test("persists failed fatal notifications and retries after a restart without new logs", async () => {
  let state = { logOffset: 42, logFingerprints: {}, pendingFatalAlerts: [] };
  let persisted;
  const save = async () => { persisted = JSON.stringify(state); };
  enqueueFatalAlerts(state, fatalLine, 1_000);
  await deliverPendingFatalAlerts(state, async () => false, save, () => 1_000);
  assert.equal(state.pendingFatalAlerts.length, 1);
  assert.equal(Object.keys(state.logFingerprints).length, 0);
  state = JSON.parse(persisted);
  assert.equal(state.logOffset, 42);
  enqueueFatalAlerts(state, fatalLine, 2_000);
  assert.equal(state.pendingFatalAlerts.length, 1);
  let delivered = 0;
  await deliverPendingFatalAlerts(state, async (message) => {
    assert.equal(JSON.parse(persisted).pendingFatalAlerts.length, 1);
    assert.match(message, /Failed to load map/);
    delivered += 1;
    return true;
  }, save, () => 2_000);
  assert.equal(delivered, 1);
  assert.equal(JSON.parse(persisted).pendingFatalAlerts.length, 0);
  assert.equal(Object.keys(state.logFingerprints).length, 1);
  enqueueFatalAlerts(state, fatalLine, 3_000);
  assert.equal(state.pendingFatalAlerts.length, 0);
});

test("fatal delivery waits for durable persistence and retains every batch", async () => {
  const state = { logFingerprints: {}, pendingFatalAlerts: [] };
  enqueueFatalAlerts(state, Array.from({ length: 7 }, (_, i) => `${fatalLine} ${String.fromCharCode(65 + i)}`).join("\n"));
  let sent = 0;
  await assert.rejects(deliverPendingFatalAlerts(state, async () => { sent++; return true; }, async () => { throw new Error("disk full"); }), /disk full/);
  assert.equal(sent, 0);
  assert.equal(state.pendingFatalAlerts.length, 7);
  await deliverPendingFatalAlerts(state, async () => { sent++; return true; }, async () => {});
  assert.equal(state.pendingFatalAlerts.length, 2);
  await deliverPendingFatalAlerts(state, async () => { sent++; return true; }, async () => {});
  assert.equal(state.pendingFatalAlerts.length, 0);
  assert.equal(sent, 2);
});

test("long fatal messages remain pending until they fit in a later notification", async () => {
  const state = { logFingerprints: {}, pendingFatalAlerts: [] };
  enqueueFatalAlerts(state, Array.from({ length: 5 }, (_, i) => `${fatalLine} ${String.fromCharCode(65 + i)} ${"x".repeat(500)}`).join("\n"));
  let sent = 0;
  while (state.pendingFatalAlerts.length) {
    await deliverPendingFatalAlerts(state, async (message) => {
      assert.ok(message.length < 1_950);
      sent++;
      return true;
    }, async () => {});
  }
  assert.equal(Object.keys(state.logFingerprints).length, 5);
  assert.equal(sent, 3);
});
