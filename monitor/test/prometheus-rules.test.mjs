import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rules = readFileSync(
  new URL("../../observability/prometheus/rules.yml", import.meta.url),
  "utf8",
);

function alertBlock(name) {
  const match = rules.match(new RegExp(`- alert: ${name}\\n([\\s\\S]*?)(?=\\n      - alert:|$)`));
  assert.ok(match, `Missing alert ${name}`);
  return match[1];
}

test("match funnel alert requires a fresh, match-ready per-mode queue", () => {
  const block = alertBlock("CookieBuildMatchFunnelStalled");
  assert.match(block, /cookiebuild_queue_ready_to_start == 1/);
  assert.match(block, /cookiebuild_queue_eligible_players >= cookiebuild_queue_minimum_players/);
  assert.match(block, /cookiebuild_queue_oldest_wait_seconds > 90/);
  assert.match(block, /cookiebuild_queue_state_observed_timestamp_seconds < 45/);
  assert.match(block, /max_over_time\(cookiebuild_monitor_maintenance\[15m\]\) == 0/);
  assert.match(block, /for: 2m/);
  assert.doesNotMatch(block, /cookiebuild_monitor_online_players|event="queue_joined"/);
});

test("client version alert is grouped, thresholded and delayed", () => {
  const block = alertBlock("CookieBuildClientVersionRejections");
  assert.match(block, /sum by \(source, edition, direction, protocol\)/);
  assert.match(block, /increase\(cookiebuild_client_version_rejections_total\[15m\]\)\) >= 3/);
  assert.match(block, /for: 5m/);
  assert.match(block, /max_over_time\(cookiebuild_monitor_maintenance\[15m\]\) == 0/);
});
