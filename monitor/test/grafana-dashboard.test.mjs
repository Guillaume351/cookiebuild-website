import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = JSON.parse(readFileSync(
  new URL("../../observability/grafana/dashboards/cookiebuild.json", import.meta.url),
  "utf8",
));

function panel(id) {
  const value = dashboard.panels.find((candidate) => candidate.id === id);
  assert.ok(value, `Missing Grafana panel ${id}`);
  return value;
}

test("shows one shared Paper player population instead of duplicating Java and Bedrock", () => {
  const currentPlayers = panel(1);
  const playerHistory = panel(5);
  const totalPlayersQuery = "max(cookiebuild_monitor_online_players)";

  assert.equal(currentPlayers.targets.length, 1);
  assert.equal(currentPlayers.targets[0].expr, totalPlayersQuery);
  assert.match(currentPlayers.title, /total/i);
  assert.match(currentPlayers.description, /Geyser/);

  assert.equal(playerHistory.targets.length, 1);
  assert.equal(playerHistory.targets[0].expr, totalPlayersQuery);
  assert.equal(playerHistory.targets[0].legendFormat, "Java + Bedrock total");
  assert.match(playerHistory.title, /total/i);
  assert.match(playerHistory.description, /one total/);
  assert.doesNotMatch(JSON.stringify(playerHistory.targets), /\{\{edition\}\}/);
});
