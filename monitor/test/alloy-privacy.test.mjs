import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const config = readFileSync(
  new URL("../../observability/alloy/config.alloy", import.meta.url),
  "utf8",
);

test("does not duplicate raw client-version refusal identities into Loki", () => {
  assert.match(config, /forward_to = \[loki\.process\.minecraft_privacy\.receiver\]/);
  assert.match(config, /stage\.drop/);
  assert.match(config, /Outdated Bedrock client/);
  assert.match(config, /Outdated Geyser proxy/);
  assert.match(config, /Outdated client/);
  assert.match(config, /Outdated server/);
  assert.match(config, /drop_counter_reason = "client_version_rejection_privacy"/);
});
