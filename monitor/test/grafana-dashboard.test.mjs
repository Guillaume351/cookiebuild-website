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

test("shows privacy-safe accepted, rejected, top and minority client versions", () => {
  const volume = panel(15);
  const rate = panel(16);
  const top = panel(17);
  const rejections = panel(18);
  const minority = panel(19);
  const versionVariable = dashboard.templating.list.find(({ name }) => name === "version_window");

  assert.deepEqual(versionVariable.options.map(({ value }) => value), ["15m", "1h", "6h", "24h", "7d"]);
  assert.match(volume.targets[0].expr, /result, edition/);
  assert.match(rate.targets[0].expr, /result=\"accepted\"/);
  assert.match(rate.targets[0].expr, /\$\{version_window\}/);
  assert.match(top.targets[0].expr, /topk\(10/);
  assert.match(top.targets[0].expr, /client_version, protocol/);
  assert.match(rejections.targets[0].expr, /result=\"rejected\"/);
  assert.match(rejections.targets[0].expr, /direction/);
  assert.match(minority.targets[0].expr, /bottomk\(10/);
  assert.match(minority.description, /least-used|minority/i);
  assert.doesNotMatch(
    JSON.stringify([volume, rate, top, rejections, minority]),
    /player_name|username|ip_address|player=|uuid/i,
  );
  assert.equal(panel(1).targets[0].expr, "max(cookiebuild_monitor_online_players)");
  assert.equal(panel(5).targets[0].expr, "max(cookiebuild_monitor_online_players)");
});
