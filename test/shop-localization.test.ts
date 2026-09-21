import { describe, expect, it } from "vitest";
import { COSMETIC_CATALOG, COSMETIC_PRODUCTS } from "../shared/cosmetics-catalog";
import { SITE_LOCALES } from "../utils/site-locales";
import { SHOP_COPY, SHOP_FAIRNESS, SHOP_ITEMS, shopItemCopy } from "../utils/shop-copy";

describe("public shop localization", () => {
  it("covers every published cosmetic and public label in all header languages", () => {
    const before = JSON.stringify({ items: COSMETIC_CATALOG, products: COSMETIC_PRODUCTS });
    for (const { code } of SITE_LOCALES) {
      expect(Object.keys(SHOP_COPY[code]).sort()).toEqual(Object.keys(SHOP_COPY.en).sort());
      expect(Object.values(SHOP_COPY[code]).every((text) => text.trim().length > 0)).toBe(true);
      expect(Object.keys(SHOP_ITEMS[code]).sort()).toEqual(COSMETIC_CATALOG.map((item) => item.id).sort());
      expect(SHOP_FAIRNESS[code]).toHaveLength(5);
      expect(SHOP_COPY[code].freeInstructions).toContain("/shop");
      for (const item of COSMETIC_CATALOG) {
        const text = shopItemCopy(code, item);
        expect(text.name.length).toBeGreaterThan(2);
        expect(text.description.length).toBeGreaterThan(15);
      }
    }
    expect(JSON.stringify({ items: COSMETIC_CATALOG, products: COSMETIC_PRODUCTS })).toBe(before);
  });

  it("preserves display data for a future catalog item until its translation is supplied", () => {
    const future = { id: "future", name: "Future item", description: "Future public description" };
    expect(shopItemCopy("fr", future)).toBe(future);
  });
});
