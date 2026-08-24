import policy from "../../contracts/skyblock-management-v1.json";

export const SKYBLOCK_MANAGEMENT_POLICY_VERSION = policy.policyVersion;
export const SKYBLOCK_ECONOMY_VERSION = policy.economyVersion;
export const SKYBLOCK_MAX_GENERATOR_TIER = policy.generator.maxTier;

export function skyblockBuildRadiusForTier(tier: number) {
  if (
    !Number.isSafeInteger(tier) ||
    tier < 1 ||
    tier > SKYBLOCK_MAX_GENERATOR_TIER
  ) {
    throw new Error("Invalid Skyblock generator tier");
  }
  const configured = policy.generator.tiers.find(
    (candidate) => candidate.tier === tier,
  );
  if (!configured) throw new Error("Missing Skyblock generator tier");
  return configured.buildRadius;
}

export function skyblockGeneratorUpgradeCost(nextTier: number) {
  const cost = skyblockGeneratorUpgradeRequirement(nextTier).costCoins;
  if (cost === undefined || cost === null)
    throw new Error("Invalid Skyblock generator upgrade tier");
  return cost;
}

export function skyblockGeneratorUpgradeRequirement(nextTier: number) {
  const configured = policy.generator.tiers.find(
    (candidate) => candidate.tier === nextTier,
  );
  if (!configured || configured.upgradeCostCoins === null) {
    throw new Error("Invalid Skyblock generator upgrade tier");
  }
  return {
    costCoins: configured.upgradeCostCoins,
    resources: configured.requiredResources.map((resource) => ({ ...resource })),
  };
}

export function skyblockGeneratorDropChances(tier: number) {
  const configured = policy.generator.tiers.find(
    (candidate) => candidate.tier === tier,
  );
  if (!configured) throw new Error("Invalid Skyblock generator tier");
  return configured.dropChances.map((drop) => ({ ...drop }));
}

export const SKYBLOCK_WORKER_TYPES = ["miner", "farmer", "lumberjack"] as const;
export const SKYBLOCK_WORKER_STATUSES = ["active", "paused"] as const;

export type SkyblockWorkerType = (typeof SKYBLOCK_WORKER_TYPES)[number];
export type SkyblockWorkerStatus = (typeof SKYBLOCK_WORKER_STATUSES)[number];

export interface SkyblockQuestDefinition {
  id: string;
  chapter: number;
  event: string;
  subject: string;
  target: number;
  rewardCoins: number;
  optional: boolean;
}

/** Must stay byte-for-byte semantically aligned with gameplay QuestCatalog V1. */
export const SKYBLOCK_QUESTS: readonly SkyblockQuestDefinition[] =
  policy.quests;

export const SKYBLOCK_WORKER_POLICY = policy.workers;
export const SKYBLOCK_WORKER_UNLOCKS = policy.workers.types;

export function skyblockWorkerBufferCapacity(tier: number) {
  if (!Number.isSafeInteger(tier) || tier < 1 || tier > 5) {
    throw new Error("Invalid Skyblock worker tier");
  }
  const capacity = SKYBLOCK_WORKER_POLICY.tiers.find(
    (candidate) => candidate.tier === tier,
  )?.bufferCapacity;
  if (!capacity) throw new Error("Missing Skyblock worker capacity");
  return capacity;
}

export function skyblockWorkerUpgradeCapacity(
  nextTier: number,
  unlockSource: string,
) {
  if (!Number.isSafeInteger(nextTier) || nextTier < 2 || nextTier > 5) {
    throw new Error("Invalid Skyblock worker upgrade tier");
  }
  return unlockSource === "legacy_v2"
    ? nextTier * SKYBLOCK_WORKER_POLICY.tierBufferCapacityMultiplier
    : skyblockWorkerBufferCapacity(nextTier);
}

export const SKYBLOCK_MAX_WORKER_TIER = 5;

export function skyblockWorkerIntervalSeconds(tier: number) {
  const interval = SKYBLOCK_WORKER_POLICY.tiers.find(
    (candidate) => candidate.tier === tier,
  )?.intervalSeconds;
  if (!interval) throw new Error("Invalid Skyblock worker tier");
  return interval;
}

export function skyblockWorkerUpgradeCost(nextTier: number) {
  const cost = SKYBLOCK_WORKER_POLICY.tiers.find(
    (candidate) => candidate.tier === nextTier,
  )?.upgradeCostCoins;
  if (!cost) throw new Error("Invalid Skyblock worker upgrade tier");
  return cost;
}

export function skyblockQuest(questId: string) {
  return SKYBLOCK_QUESTS.find((quest) => quest.id === questId);
}
