export interface KitLevelDefinition {
  level: number;
  price: number;
  requiredLevel: number;
  defaultUnlocked?: boolean;
}

export interface KitDefinition {
  id: string;
  name: string;
  description: string;
  levels: KitLevelDefinition[];
}

const MICRO_KITS: KitDefinition[] = [
  { id: "default", name: "Default", description: "Reliable sword, bow, blocks and food.", levels: [{ level: 0, price: 0, requiredLevel: 1, defaultUnlocked: true }] },
  { id: "explosive_archer", name: "Explosive Archer", description: "Limited arrows create a small enemy-only blast on impact.", levels: tiered(500, 7) },
  { id: "enderman", name: "Enderman", description: "A light melee kit with a few repositioning pearls.", levels: tiered(1_000, 16) },
  { id: "knockback_warrior", name: "Knockback Warrior", description: "Controls ledges with Knockback I but deals little direct damage.", levels: tiered(300, 0, true) },
  { id: "tank", name: "Tank", description: "Shield and extra armor, traded for permanent Slowness.", levels: tiered(900, 15) },
  { id: "ninja", name: "Ninja", description: "Fast skirmisher with snowballs and double-sneak stealth.", levels: tiered(1_200, 22) },
  { id: "archer", name: "Archer", description: "Long-range pressure with more arrows, but weak melee gear.", levels: tiered(500, 0, true) },
  { id: "berserker", name: "Berserker", description: "Axe fighter who briefly gains Strength below 30% health.", levels: tiered(600, 8) },
  { id: "chemist", name: "Chemist", description: "Carries useful single-use drinkable potions.", levels: tiered(1_100, 20) },
  { id: "assassin", name: "Assassin", description: "Double-sneak stealth empowers one carefully timed melee hit.", levels: tiered(1_400, 28) },
  { id: "miner", name: "Miner", description: "Fast mining and extra blocks for map control, with weak combat gear.", levels: tiered(300, 3) },
  { id: "vampire", name: "Vampire", description: "Restores a small amount of health on enemy melee hits.", levels: tiered(900, 14) },
  { id: "frost_mage", name: "Frost Mage", description: "Snowballs slow enemies; the wand creates a short temporary ice bridge.", levels: tiered(1_300, 25) },
  { id: "juggernaut", name: "Juggernaut", description: "Heavy armor, axe and shield at the cost of severe Slowness.", levels: tiered(1_600, 30) },
  { id: "trapper", name: "Trapper", description: "Cobwebs and utility supplies reward controlling narrow routes.", levels: tiered(400, 5) },
  { id: "alchemist", name: "Alchemist", description: "The brewing stand grants one random short self-buff on cooldown.", levels: tiered(800, 12) },
  { id: "mobility", name: "Mobility", description: "Permanent Speed and light gear for rotations and escapes.", levels: tiered(400, 4) },
];

const SKYWARS_KITS: KitDefinition[] = [
  { id: "scout", name: "Scout", description: "Fast opening pressure, but no bonus armor.", levels: [{ level: 1, price: 0, requiredLevel: 1, defaultUnlocked: true }] },
  { id: "armorer", name: "Armorer", description: "Safer armor start, but no bonus weapon or blocks.", levels: [{ level: 1, price: 150, requiredLevel: 1 }] },
  { id: "builder", name: "Builder", description: "More bridge blocks and a pickaxe, but weak direct combat.", levels: [{ level: 1, price: 100, requiredLevel: 1 }] },
  { id: "healer", name: "Healer", description: "One recovery opportunity, but no weapon or armor advantage.", levels: [{ level: 1, price: 125, requiredLevel: 1 }] },
];

export const MOBILE_KIT_CATALOG = {
  microbattles: { name: "MicroBattles", kits: MICRO_KITS },
  skywars: { name: "SkyWars", kits: SKYWARS_KITS },
} as const;

function tiered(price: number, requiredLevel: number, starter = false): KitLevelDefinition[] {
  const firstRequired = Math.max(1, Math.floor(requiredLevel / 3));
  return [
    { level: 1, price: starter ? 0 : Math.floor(price / 2), requiredLevel: firstRequired, defaultUnlocked: starter },
    { level: 2, price, requiredLevel: Math.max(firstRequired + 2, Math.floor(requiredLevel * 2 / 3)) },
    { level: 3, price: price * 2, requiredLevel },
  ];
}

function isoWeek(date: Date) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  return {
    year: value.getUTCFullYear(),
    week: Math.ceil((((value.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7),
  };
}

class JavaRandom {
  private static readonly multiplier = BigInt("25214903917");
  private static readonly addend = BigInt(11);
  private static readonly mask = (BigInt(1) << BigInt(48)) - BigInt(1);
  private seed: bigint;

  constructor(seed: number) {
    this.seed = (BigInt(seed) ^ JavaRandom.multiplier) & JavaRandom.mask;
  }

  private next(bits: number) {
    this.seed = (
      this.seed * JavaRandom.multiplier + JavaRandom.addend
    ) & JavaRandom.mask;
    return Number(this.seed >> BigInt(48 - bits));
  }

  nextInt(bound: number) {
    if (bound <= 0) throw new Error("bound must be positive");
    if ((bound & -bound) === bound) return Math.floor((bound * this.next(31)) / 2 ** 31);
    let bits: number;
    let value: number;
    do {
      bits = this.next(31);
      value = bits % bound;
    } while (bits - value + (bound - 1) >= 2 ** 31);
    return value;
  }
}

/** Exact TypeScript equivalent of MicroBattles' deterministic Java weekly rotation. */
export function weeklyFreeMicroKits(now = new Date()) {
  const candidates = MICRO_KITS
    .filter((kit) => kit.id !== "default")
    .map((kit) => kit.name)
    .sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase()));
  const week = isoWeek(now);
  const random = new JavaRandom(week.year * 100 + week.week);
  for (let index = candidates.length; index > 1; index -= 1) {
    const swap = random.nextInt(index);
    [candidates[index - 1], candidates[swap]] = [candidates[swap]!, candidates[index - 1]!];
  }
  return candidates.slice(0, 2);
}
