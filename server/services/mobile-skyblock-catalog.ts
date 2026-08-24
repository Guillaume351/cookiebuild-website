import catalog from "../../contracts/skyblock-items-v2.json";

export const SKYBLOCK_CATEGORIES = [
  "mining",
  "farming",
  "foraging",
  "combat",
] as const;
export const SKYBLOCK_RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
] as const;

export type SkyblockCategory = (typeof SKYBLOCK_CATEGORIES)[number];
export type SkyblockRarity = (typeof SKYBLOCK_RARITIES)[number];

export interface SkyblockCatalogItem {
  id: string;
  material: string;
  name: string;
  category: SkyblockCategory;
  rarity: SkyblockRarity;
  npcSellCoins: number;
  npcBuyCoins: number;
  tradeable: boolean;
  maxStack: number;
  minListingCoins: number;
  maxListingCoins: number;
}

export const SKYBLOCK_CATALOG_VERSION = catalog.catalogVersion;
export const SKYBLOCK_ITEM_CATALOG = catalog.items as SkyblockCatalogItem[];
const ITEMS_BY_ID = new Map(
  SKYBLOCK_ITEM_CATALOG.map((item) => [item.id, item]),
);

export function skyblockCatalogItem(itemId: string) {
  return ITEMS_BY_ID.get(itemId);
}

export function skyblockCatalogItemsForCategory(
  category: SkyblockCategory | null,
) {
  return category
    ? SKYBLOCK_ITEM_CATALOG.filter((item) => item.category === category)
    : SKYBLOCK_ITEM_CATALOG;
}
