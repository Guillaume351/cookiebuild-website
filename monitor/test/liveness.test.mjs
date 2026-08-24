import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const monitor = readFileSync(new URL("../src/monitor.mjs", import.meta.url), "utf8");
const dockerfile = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");

test("keeps process liveness independent from monitored dependency readiness", () => {
  assert.match(monitor, /request\.url === "\/livez"/);
  assert.match(monitor, /response\.writeHead\(200/);
  assert.match(monitor, /request\.url === "\/healthz"/);
  assert.match(monitor, /status\.ok \? 200 : 503/);
  assert.match(dockerfile, /127\.0\.0\.1:8080\/livez/);
  assert.doesNotMatch(dockerfile, /127\.0\.0\.1:8080\/healthz/);
});
