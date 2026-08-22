import assert from "node:assert/strict";
import test from "node:test";

import {
  clientVersionCounterKey,
  parseClientVersionCounterKey,
  recordClientVersionRejections,
} from "../src/client-versions.mjs";

test("classifies real Geyser old/new Bedrock refusals without retaining identity", () => {
  const counters = recordClientVersionRejections([
    "[Geyser-Spigot] Bedrock user with ip: /10.0.0.2 has disconnected for reason §rOutdated Bedrock client! This server supports 26.0, 26.45",
    "[Geyser-Spigot] private-player disconnected because Outdated Geyser proxy! This server supports 26.0, 26.45",
    "[Geyser-Spigot] joueur a été déconnecté : Client Bedrock obsolète !",
    "[Geyser-Spigot] joueur a été déconnecté : Proxy Geyser obsolète !",
  ].join("\n"));

  assert.equal(counters[clientVersionCounterKey("geyser", "bedrock", "too_old")], 2);
  assert.equal(counters[clientVersionCounterKey("geyser", "bedrock", "too_new")], 2);
  assert.doesNotMatch(JSON.stringify(counters), /10\.0\.0\.2|private-player|joueur/);
});

test("uses the Geyser marker before generic Paper wording", () => {
  const counters = recordClientVersionRejections([
    "[Geyser-Spigot] hidden was disconnected because Outdated server! I'm still on 1.21.4",
    "[Server thread/INFO]: hidden lost connection: Outdated server! I'm still on 26.2",
    "[Server thread/INFO]: hidden lost connection: Outdated client! Please use 26.2",
    "[ViaVersion] You are using an unsupported Minecraft version!",
  ].join("\n"));

  assert.equal(counters[clientVersionCounterKey("geyser", "bedrock", "too_new")], 1);
  assert.equal(counters[clientVersionCounterKey("paper", "java", "too_new")], 1);
  assert.equal(counters[clientVersionCounterKey("paper", "java", "too_old")], 1);
  assert.equal(counters[clientVersionCounterKey("viaversion", "java", "unsupported")], 1);
});

test("keeps protocol labels bounded and rejects malformed persisted labels", () => {
  const counters = {};
  for (let protocol = 1; protocol <= 33; protocol += 1) {
    recordClientVersionRejections(
      `[Geyser-Spigot] Outdated Bedrock client! protocolVersion=${protocol}`,
      counters,
    );
  }
  assert.equal(counters[clientVersionCounterKey("geyser", "bedrock", "too_old", "other")], 1);
  assert.deepEqual(
    parseClientVersionCounterKey(clientVersionCounterKey("paper", "java", "too_old", "776")),
    ["paper", "java", "too_old", "776"],
  );
  assert.throws(() => parseClientVersionCounterKey('["paper","java","bad","776"]'));
});

test("ignores decoder errors and ordinary disconnects", () => {
  const counters = recordClientVersionRejections([
    "Exception caught in session of unknown (pre-login)",
    "PacketSerializeException: LoginPacket(protocolVersion=7405716)",
    "[Geyser-Spigot] player disconnected: Bedrock client timed out",
  ].join("\n"));
  assert.deepEqual(counters, {});
});
