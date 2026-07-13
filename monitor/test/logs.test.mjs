import assert from "node:assert/strict";
import test from "node:test";

import { isFatalLogLine, selectNewFatalLines } from "../src/logs.mjs";

test("detects game and Paper fatal errors without authentication noise", () => {
  assert.equal(isFatalLogLine("[Server thread/ERROR]: [MicroBattles] Failed to load map for MicroBattlesGame: bad zip"), true);
  assert.equal(isFatalLogLine("[Server thread/ERROR]: Could not pass event PlayerMoveEvent to Pitchout"), true);
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
