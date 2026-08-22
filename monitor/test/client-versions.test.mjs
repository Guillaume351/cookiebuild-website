import assert from "node:assert/strict";
import test from "node:test";

import {
  clientConnectionCounterKey,
  parseClientConnectionCounterKey,
  recordClientConnections,
} from "../src/client-versions.mjs";

test("counts actual admitted Java and Bedrock sessions by bounded version without identity", () => {
  const counters = recordClientConnections([
    "[CookieDough] [funnel] event=joined player=private-bedrock edition=bedrock protocol=unknown client_version=26.44 locale=en-US",
    "[CookieDough] [funnel] event=joined player=private-java edition=java protocol=776 client_version=protocol-776 locale=fr-FR",
  ].join("\n"));

  assert.equal(counters[clientConnectionCounterKey(
    "accepted", "cookiedough", "bedrock", "none", "26.44", "unknown",
  )], 1);
  assert.equal(counters[clientConnectionCounterKey(
    "accepted", "cookiedough", "java", "none", "protocol-776", "776",
  )], 1);
  assert.doesNotMatch(JSON.stringify(counters), /private-bedrock|private-java|en-US|fr-FR/);
});

test("classifies real Geyser old/new Bedrock refusals without retaining identity", () => {
  const counters = recordClientConnections([
    "[Geyser-Spigot] Bedrock user with ip: /10.0.0.2 has disconnected for reason §rOutdated Bedrock client! This server supports 26.0, 26.45",
    "[Geyser-Spigot] private-player disconnected because Outdated Geyser proxy! This server supports 26.0, 26.45",
    "[Geyser-Spigot] joueur a été déconnecté : Client Bedrock obsolète !",
    "[Geyser-Spigot] joueur a été déconnecté : Proxy Geyser obsolète !",
  ].join("\n"));

  assert.equal(counters[clientConnectionCounterKey(
    "rejected", "geyser", "bedrock", "too_old", "unknown", "unknown",
  )], 2);
  assert.equal(counters[clientConnectionCounterKey(
    "rejected", "geyser", "bedrock", "too_new", "unknown", "unknown",
  )], 2);
  assert.doesNotMatch(JSON.stringify(counters), /10\.0\.0\.2|private-player|joueur/);
});

test("uses the Geyser marker before generic Paper wording", () => {
  const counters = recordClientConnections([
    "[Geyser-Spigot] hidden was disconnected because Outdated server! I'm still on 1.21.4",
    "[Server thread/INFO]: hidden lost connection: Outdated server! I'm still on 26.2",
    "[Server thread/INFO]: hidden lost connection: Outdated client! Please use 26.2",
    "[ViaVersion] You are using an unsupported Minecraft version!",
  ].join("\n"));

  assert.equal(counters[clientConnectionCounterKey(
    "rejected", "geyser", "bedrock", "too_new", "unknown", "unknown",
  )], 1);
  assert.equal(counters[clientConnectionCounterKey(
    "rejected", "paper", "java", "too_new", "unknown", "unknown",
  )], 1);
  assert.equal(counters[clientConnectionCounterKey(
    "rejected", "paper", "java", "too_old", "unknown", "unknown",
  )], 1);
  assert.equal(counters[clientConnectionCounterKey(
    "rejected", "viaversion", "java", "unsupported", "unknown", "unknown",
  )], 1);
});

test("keeps version and protocol labels bounded and rejects malformed persisted labels", () => {
  const protocols = {};
  for (let protocol = 1; protocol <= 33; protocol += 1) {
    recordClientConnections(
      `[Geyser-Spigot] Outdated Bedrock client! protocolVersion=${protocol}`,
      protocols,
    );
  }
  assert.equal(protocols[clientConnectionCounterKey(
    "rejected", "geyser", "bedrock", "too_old", "unknown", "other",
  )], 1);

  const versions = {};
  for (let version = 1; version <= 65; version += 1) {
    recordClientConnections(
      `[CookieDough] [funnel] event=joined edition=bedrock protocol=unknown client_version=26.${version}`,
      versions,
    );
  }
  assert.equal(versions[clientConnectionCounterKey(
    "accepted", "cookiedough", "bedrock", "none", "other", "unknown",
  )], 1);
  assert.deepEqual(
    parseClientConnectionCounterKey(clientConnectionCounterKey(
      "accepted", "cookiedough", "java", "none", "protocol-776", "776",
    )),
    ["accepted", "cookiedough", "java", "none", "protocol-776", "776"],
  );
  assert.throws(() => parseClientConnectionCounterKey(
    '["rejected","paper","java","none","unknown","776"]',
  ));
});

test("does not invent client versions from server-supported text and ignores unrelated errors", () => {
  const counters = recordClientConnections([
    "[Geyser-Spigot] hidden disconnected: Outdated Bedrock client! This server supports 26.0, 26.45",
    "Exception caught in session of unknown (pre-login)",
    "PacketSerializeException: LoginPacket(protocolVersion=7405716)",
    "[Geyser-Spigot] player disconnected: Bedrock client timed out",
  ].join("\n"));
  assert.equal(counters[clientConnectionCounterKey(
    "rejected", "geyser", "bedrock", "too_old", "unknown", "unknown",
  )], 1);
  assert.equal(Object.keys(counters).length, 1);
});
