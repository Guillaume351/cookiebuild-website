import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const websiteRoot = path.resolve(import.meta.dirname, "..");
const gameplayRoot = path.resolve(process.argv[2] ?? path.join(websiteRoot, "..", "Cookies"));
const contract = JSON.parse(await readFile(
  path.join(websiteRoot, "contracts", "skyblock-management-v1.json"),
  "utf8",
));
const [generatorSource, expansionSource, questSource, workerSource, workerUnlockSource] = await Promise.all([
  readFile(path.join(
    gameplayRoot,
    "Skyblock/src/main/java/com/cookiebuild/skyblock/generator/GeneratorPolicy.java",
  ), "utf8"),
  readFile(path.join(
    gameplayRoot,
    "Skyblock/src/main/java/com/cookiebuild/skyblock/progression/IslandExpansionPolicy.java",
  ), "utf8"),
  readFile(path.join(
    gameplayRoot,
    "Skyblock/src/main/java/com/cookiebuild/skyblock/progression/QuestCatalog.java",
  ), "utf8"),
  readFile(path.join(
    gameplayRoot,
    "Skyblock/src/main/java/com/cookiebuild/skyblock/workers/WorkerProductionPolicy.java",
  ), "utf8"),
  readFile(path.join(
    gameplayRoot,
    "Skyblock/src/main/java/com/cookiebuild/skyblock/workers/WorkerUnlockPolicy.java",
  ), "utf8"),
]);

const requirements = new Map([...generatorSource.matchAll(
  /case\s+(\d+)\s*->\s*new UpgradeRequirement\(([\d_]+),\s*Map\.of\("([a-z_]+)",\s*([\d_]+)L\)\)/g,
)].map((match) => [Number(match[1]), {
  costCoins: Number(match[2].replaceAll("_", "")),
  resources: [{ itemId: match[3], quantity: Number(match[4].replaceAll("_", "")) }],
}]));
const drops = new Map([...generatorSource.matchAll(
  /case\s+(\d+)\s*->\s*List\.of\(([\s\S]*?)\);/g,
)].map((match) => [Number(match[1]), [...match[2].matchAll(
  /new DropChance\("([a-z_]+)",\s*(\d+)\)/g,
)].map((drop) => ({ itemId: drop[1], percent: Number(drop[2]) }))]));
const gameplayGenerator = contract.generator.tiers.map((tier) => ({
  tier: tier.tier,
  upgradeCostCoins: tier.tier === 1 ? null : requirements.get(tier.tier)?.costCoins,
  requiredResources: tier.tier === 1 ? [] : requirements.get(tier.tier)?.resources,
  dropChances: drops.get(tier.tier),
}));
assert.deepEqual(gameplayGenerator, contract.generator.tiers.map(({ buildRadius, ...tier }) => tier),
  "Generator policy drifted from mobile contract");
const expansionRadii = [...new Set([...expansionSource.matchAll(/return\s+([\d_]+);/g)]
  .map((match) => Number(match[1].replaceAll("_", ""))))].sort((first, second) => first - second);
assert.deepEqual(contract.generator.tiers.map(({ buildRadius }) => buildRadius), expansionRadii,
  "Legacy mobile build-radius hints drifted from IslandExpansionPolicy");

const gameplayQuests = [...questSource.matchAll(
  /new Quest\("([a-z0-9_]+)",\s*(\d+),\s*"([a-z_]+)",\s*"([a-z0-9_]+)",\s*(\d+),\s*(\d+),\s*(true|false)\)/g,
)].map((match) => ({
  id: match[1],
  chapter: Number(match[2]),
  event: match[3],
  subject: match[4],
  target: Number(match[5]),
  rewardCoins: Number(match[6]),
  optional: match[7] === "true",
}));
assert.deepEqual(gameplayQuests, contract.quests, "QuestCatalog drifted from mobile contract");

const offlineCap = workerSource.match(/OFFLINE_CAP\s*=\s*Duration\.ofHours\((\d+)\)/);
const clockSkew = workerSource.match(/CLOCK_SKEW_TOLERANCE\s*=\s*Duration\.ofSeconds\((\d+)\)/);
const interval = workerSource.match(/Math\.max\((\d+)L,\s*(\d+)L\s*-\s*\(tier\s*-\s*1L\)\s*\*\s*(\d+)L\)/);
const legacyCapacityMultiplier = workerSource.match(/legacyV2\s*\?\s*nextTier\s*\*\s*([\d_]+)L/);
const capacityBlock = workerSource.match(/bufferCapacity\(int tier\)[\s\S]*?return switch \(tier\) \{([\s\S]*?)\n\s*};/);
const costBlock = workerSource.match(/upgradeCost\(int nextTier\)[\s\S]*?return switch \(nextTier\) \{([\s\S]*?)\n\s*};/);
const capacities = new Map([...(capacityBlock?.[1] ?? "").matchAll(/case\s+(\d+)\s*->\s*([\d_]+)L;/g)]
  .map((match) => [Number(match[1]), Number(match[2].replaceAll("_", ""))]));
const workerCosts = new Map([...(costBlock?.[1] ?? "").matchAll(/case\s+(\d+)\s*->\s*([\d_]+);/g)]
  .map((match) => [Number(match[1]), Number(match[2].replaceAll("_", ""))]));
const itemsBlock = workerSource.match(/ITEMS\s*=\s*Map\.of\(([\s\S]*?)\);/);
assert.ok(offlineCap && clockSkew && interval && legacyCapacityMultiplier
  && capacityBlock && costBlock && itemsBlock,
  "Could not parse WorkerProductionPolicy");
const itemTokens = [...itemsBlock[1].matchAll(/"([a-z_]+)"/g)].map((match) => match[1]);
const gameplayTypes = [];
for (let index = 0; index < itemTokens.length; index += 2) {
  gameplayTypes.push({ type: itemTokens[index], itemId: itemTokens[index + 1] });
}
assert.equal(Number(offlineCap[1]), contract.workers.offlineCapHours, "Worker offline cap drifted");
assert.equal(Number(clockSkew[1]), contract.workers.clockSkewToleranceSeconds,
  "Worker clock-skew tolerance drifted");
assert.equal(Number(legacyCapacityMultiplier[1].replaceAll("_", "")),
  contract.workers.tierBufferCapacityMultiplier,
  "Legacy V2 worker capacity multiplier drifted");
assert.deepEqual(gameplayTypes, contract.workers.types.map(({ type, itemId }) => ({ type, itemId })),
  "Worker types drifted from mobile contract");
const gameplayWorkerTiers = contract.workers.tiers.map(({ tier }) => ({
    tier,
    intervalSeconds: Math.max(
      Number(interval[1]),
      Number(interval[2]) - (tier - 1) * Number(interval[3]),
    ),
    bufferCapacity: capacities.get(tier),
    upgradeCostCoins: tier === 1 ? null : workerCosts.get(tier),
  }));
assert.deepEqual(gameplayWorkerTiers, contract.workers.tiers,
  "Worker production policy drifted from mobile contract");

const unlockConstants = new Map([...workerUnlockSource.matchAll(
  /public static final (?:long|int) ([A-Z_]+) = ([\d_]+);/g,
)].map((match) => [match[1], Number(match[2].replaceAll("_", ""))]));
assert.deepEqual(contract.workers.types.map(({ type, unlock }) => ({ type, unlock })), [
  { type: "miner", unlock: { kind: "collection", itemId: "cobblestone",
    quantity: unlockConstants.get("MINER_COBBLESTONE_TARGET") } },
  { type: "farmer", unlock: { kind: "quest_or_collection", questId: "first_harvest",
    itemId: "wheat", quantity: unlockConstants.get("FARMER_WHEAT_TARGET") } },
  { type: "lumberjack", unlock: { kind: "island_level",
    level: unlockConstants.get("LUMBERJACK_ISLAND_LEVEL") } },
], "Worker unlock policy drifted from mobile contract");
console.log("Skyblock gameplay management policies match contracts/skyblock-management-v1.json.");
