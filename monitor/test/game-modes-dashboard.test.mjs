import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = JSON.parse(readFileSync(
  new URL("../../observability/grafana/dashboards/game-modes.json", import.meta.url),
  "utf8",
));
const bootstrap = readFileSync(
  new URL("../../observability/postgres/bootstrap.sql", import.meta.url),
  "utf8",
);

function panel(id) {
  const value = dashboard.panels.find((candidate) => candidate.id === id);
  assert.ok(value, `Missing game-mode Grafana panel ${id}`);
  return value;
}

test("defines source-backed usage, recurrence, retention and Skyblock economy panels", () => {
  assert.equal(dashboard.uid, "cookiebuild-game-modes");
  assert.equal(dashboard.timezone, "Europe/Paris");
  assert.match(panel(1).title, /DAU/);
  assert.match(panel(3).title, /Player time/);
  assert.match(panel(4).title, /Repeat/);
  assert.match(panel(14).title, /Retention/);
  assert.match(panel(16).title, /deals/);
  assert.match(panel(18).title, /progression/i);
});

test("uses one bounded mode selector and aggregate PostgreSQL views only", () => {
  const mode = dashboard.templating.list.find((variable) => variable.name === "game_mode");
  assert.ok(mode);
  assert.equal(mode.multi, false);
  assert.equal(mode.includeAll, false);
  assert.equal(mode.current.value, "Skyblock");
  assert.match(mode.query, /metrics\.mode_engagement_summary/);

  const sql = dashboard.panels.flatMap((value) => value.targets ?? [])
    .map((target) => target.rawSql)
    .filter(Boolean)
    .join("\n");
  assert.doesNotMatch(sql, /public\.|player_id|player_name|username|uuid|island_id|session_id|listing_id|ip_address/i);
  for (const query of sql.split("\n")) assert.match(query, /metrics\./);
});

test("documents metric semantics that could otherwise be misleading", () => {
  assert.match(panel(3).description, /Participant-hours|checkpointed/);
  assert.match(panel(6).description, /proxy/);
  assert.match(panel(11).description, /do not sum/i);
  assert.match(panel(13).description, /match participation|island session/);
  assert.match(panel(14).description, /Immature/);
  assert.match(panel(17).description, /not real-money/i);
});

test("provisions privacy-safe aggregate views with mature cohort denominators", () => {
  for (const view of [
    "mode_usage_daily",
    "mode_engagement_summary",
    "mode_retention_cohorts",
    "skyblock_market_daily",
    "skyblock_progress_daily",
  ]) {
    assert.match(bootstrap, new RegExp(`CREATE OR REPLACE VIEW metrics\\.${view}`));
    assert.match(bootstrap, new RegExp(`metrics\\.${view}`));
  }
  assert.match(bootstrap, /AT TIME ZONE 'Europe\/Paris'/);
  assert.match(bootstrap, /d1_eligible/);
  assert.match(bootstrap, /d7_eligible/);
  assert.match(bootstrap, /d30_eligible/);
  assert.match(bootstrap, /REVOKE ALL ON ALL TABLES IN SCHEMA public FROM cookiebuild_metrics/);
  assert.doesNotMatch(bootstrap, /GRANT SELECT ON public\./);
});
