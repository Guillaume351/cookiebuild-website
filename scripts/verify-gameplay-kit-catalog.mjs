import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const websiteRoot = path.resolve(import.meta.dirname, "..");
const gameplayRoot = path.resolve(process.argv[2] ?? path.join(websiteRoot, "..", "Cookies"));
const contract = JSON.parse(await readFile(
  path.join(websiteRoot, "contracts", "mobile-kit-catalog-v1.json"),
  "utf8",
));

const microSource = await readFile(
  path.join(gameplayRoot, contract.gameplaySources.microbattles),
  "utf8",
);
const microGameplay = [...microSource.matchAll(
  /register\("([^"]+)",\s*([\d_]+),\s*(\d+),\s*(true|false)\)/g,
)].map((match) => ({
  name: match[1],
  price: Number(match[2].replaceAll("_", "")),
  requiredLevel: Number(match[3]),
  defaultUnlocked: match[4] === "true",
}));

const skySource = await readFile(
  path.join(gameplayRoot, contract.gameplaySources.skywars),
  "utf8",
);
const skyGameplay = [...skySource.matchAll(
  /^\s*(\w+)\("([^"]+)",\s*([\d_]+),\s*(true|false),/gm,
)].map((match) => ({
  id: match[1].toLowerCase(),
  name: match[2],
  price: Number(match[3].replaceAll("_", "")),
  defaultUnlocked: match[4] === "true",
}));

assert.deepEqual(microGameplay, contract.microbattles, "MicroBattles catalog drifted from the v1 contract");
assert.deepEqual(skyGameplay, contract.skywars, "SkyWars catalog drifted from the v1 contract");
console.log("Gameplay kit catalogs match contracts/mobile-kit-catalog-v1.json.");
