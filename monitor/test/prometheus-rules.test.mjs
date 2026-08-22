import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rules = readFileSync(
  new URL("../../observability/prometheus/rules.yml", import.meta.url),
  "utf8",
);
const alertmanager = readFileSync(
  new URL("../../observability/alertmanager/alertmanager.yml", import.meta.url),
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

test("client version alert fires on the first refusal and has no pending delay", () => {
  const block = alertBlock("CookieBuildClientVersionRejections");
  assert.match(block, /sum by \(source, edition, direction, client_version, protocol\)/);
  assert.match(block, /cookiebuild_client_version_connections_total\{result="rejected"\}\[1h\]/);
  assert.match(block, /\) > 0/);
  assert.doesNotMatch(block, /\n\s+for:/);
  assert.match(block, /cookiebuild_monitor_maintenance == 0/);
});

test("Alertmanager immediately groups and deduplicates version-refusal notifications", () => {
  assert.match(alertmanager, /alertname="CookieBuildClientVersionRejections"/);
  assert.match(alertmanager, /group_by: \[alertname, component\]/);
  assert.match(alertmanager, /group_wait: 0s/);
  assert.match(alertmanager, /group_interval: 10m/);
  assert.match(alertmanager, /repeat_interval: 6h/);
  assert.match(alertmanager, /name: discord-version-rejections[\s\S]*?send_resolved: false/);
  assert.match(alertmanager, /webhook_url_file: \/run\/secrets\/discord_webhook/);
});
