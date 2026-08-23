import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const websiteRoot = path.resolve(import.meta.dirname, "..");
const gameplayRoot = path.resolve(process.argv[2] ?? path.join(websiteRoot, "..", "Cookies"));
const contract = JSON.parse(await readFile(
  path.join(websiteRoot, "contracts", "skyblock-management-v1.json"),
  "utf8",
));
const [generatorSource, questSource, workerSource] = await Promise.all([
  readFile(path.join(
    gameplayRoot,
    "Skyblock/src/main/java/com/cookiebuild/skyblock/generator/GeneratorPolicy.java",
  ), "utf8"),
  readFile(path.join(
    gameplayRoot,
    "Skyblock/src/main/java/com/cookiebuild/skyblock/progression/QuestCatalog.java",
  ), "utf8"),
  readFile(path.join(
    gameplayRoot,
    "Skyblock/src/main/java/com/cookiebuild/skyblock/workers/WorkerProductionPolicy.java",
  ), "utf8"),
]);

const radius = generatorSource.match(/return\s+(\d+)\s*\+\s*\(tier\s*-\s*1\)\s*\*\s*(\d+)/);
assert.ok(radius, "Could not parse GeneratorPolicy.buildRadiusForTier");
const costs = new Map([...generatorSource.matchAll(/case\s+(\d+)\s*->\s*([\d_]+);/g)]
  .map((match) => [Number(match[1]), Number(match[2].replaceAll("_", ""))]));
const gameplayGenerator = contract.generator.tiers.map((tier) => ({
  tier: tier.tier,
  buildRadius: Number(radius[1]) + (tier.tier - 1) * Number(radius[2]),
  upgradeCostCoins: tier.tier === 1 ? null : costs.get(tier.tier),
}));
assert.deepEqual(gameplayGenerator, contract.generator.tiers, "Generator policy drifted from mobile contract");

const gameplayQuests = [...questSource.matchAll(
  /new Quest\("([a-z0-9_]+)",\s*(\d+),\s*"([a-z_]+)",\s*"([a-z0-9_]+)",\s*(\d+),\s*(\d+)\)/g,
)].map((match) => ({
  id: match[1],
  chapter: Number(match[2]),
  event: match[3],
  subject: match[4],
  target: Number(match[5]),
  rewardCoins: Number(match[6]),
}));
assert.deepEqual(gameplayQuests, contract.quests, "QuestCatalog drifted from mobile contract");

const offlineCap = workerSource.match(/OFFLINE_CAP\s*=\s*Duration\.ofHours\((\d+)\)/);
const interval = workerSource.match(/Math\.max\((\d+)L,\s*(\d+)L\s*-\s*\(tier\s*-\s*1L\)\s*\*\s*(\d+)L\)/);
const capacity = workerSource.match(/long capacity\s*=\s*tier\s*\*\s*(\d+)L/);
const itemsBlock = workerSource.match(/ITEMS\s*=\s*Map\.of\(([\s\S]*?)\);/);
assert.ok(offlineCap && interval && capacity && itemsBlock, "Could not parse WorkerProductionPolicy");
const itemTokens = [...itemsBlock[1].matchAll(/"([a-z_]+)"/g)].map((match) => match[1]);
const gameplayTypes = [];
for (let index = 0; index < itemTokens.length; index += 2) {
  gameplayTypes.push({ type: itemTokens[index], itemId: itemTokens[index + 1] });
}
const gameplayWorkerPolicy = {
  offlineCapHours: Number(offlineCap[1]),
  tierBufferCapacityMultiplier: Number(capacity[1]),
  types: gameplayTypes,
  tiers: contract.workers.tiers.map(({ tier }) => ({
    tier,
    intervalSeconds: Math.max(
      Number(interval[1]),
      Number(interval[2]) - (tier - 1) * Number(interval[3]),
    ),
  })),
};
assert.deepEqual(gameplayWorkerPolicy, contract.workers, "Worker production policy drifted from mobile contract");
console.log("Skyblock gameplay management policies match contracts/skyblock-management-v1.json.");
