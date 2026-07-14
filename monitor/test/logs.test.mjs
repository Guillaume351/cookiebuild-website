import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { isFatalLogLine, readNewLogChunk, selectNewFatalLines } from "../src/logs.mjs";

test("detects game and Paper fatal errors without authentication noise", () => {
  assert.equal(isFatalLogLine("[Server thread/ERROR]: [MicroBattles] Failed to load map for MicroBattlesGame: bad zip"), true);
  assert.equal(isFatalLogLine("[Server thread/ERROR]: Could not pass event PlayerMoveEvent to Pitchout"), true);
  assert.equal(isFatalLogLine("[Server thread/ERROR]: [SkyWars] Failed to load map for SkyWarsGame: missing archive"), true);
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
