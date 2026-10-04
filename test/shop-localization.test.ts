import { describe, expect, it } from "vitest";
import { COIN_COSMETICS, COSMETIC_CATALOG, COSMETIC_PRODUCTS } from "../shared/cosmetics-catalog";
import { SITE_LOCALES } from "../utils/site-locales";
import {
  COIN_ITEM_COPY,
  SHOP_COPY,
  SHOP_FAIRNESS,
  SHOP_ITEMS,
  coinItemCopy,
  shopItemCopy,
} from "../utils/shop-copy";

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

  it("localizes the name and description of every earned-coin item in every header language", () => {
    const coinIds = COIN_COSMETICS.map((item) => item.id).sort();
    expect(Object.keys(COIN_ITEM_COPY).sort()).toEqual(SITE_LOCALES.map(({ code }) => code).sort());
    for (const { code } of SITE_LOCALES) {
      expect(Object.keys(COIN_ITEM_COPY[code]).sort()).toEqual(coinIds);
      const names = new Set<string>();
      for (const item of COIN_COSMETICS) {
        const text = coinItemCopy(code, item);
        expect(text).toBe(COIN_ITEM_COPY[code][item.id]);
        expect(text.name.trim().length).toBeGreaterThan(2);
        expect(text.description.trim().length).toBeGreaterThan(15);
        names.add(text.name);
      }
      expect(names.size).toBe(COIN_COSMETICS.length);
    }
    // The catalog's French and English names stay in sync with the localized copy.
    for (const item of COIN_COSMETICS) {
      expect(COIN_ITEM_COPY.fr[item.id].name).toBe(item.name);
      expect(COIN_ITEM_COPY.en[item.id].name).toBe(item.nameEn);
      expect(item.description.startsWith(COIN_ITEM_COPY.fr[item.id].description)).toBe(true);
    }
  });

  it("explains that coin items are bought in game and the free trail is equipped automatically", () => {
    for (const { code } of SITE_LOCALES.filter((locale) => locale.code !== "en")) {
      for (const key of ["coinIntro", "freeDescription", "freeInstructions"] as const) {
        expect(SHOP_COPY[code][key]).not.toBe(SHOP_COPY.en[key]);
      }
    }
    expect(SHOP_COPY.en.coinIntro).toMatch(/trails and victory effects/);
    expect(SHOP_COPY.fr.coinIntro).toMatch(/traces de lobby et effets de victoire/);
    expect(SHOP_COPY.en.freeDescription).toMatch(/equipped automatically/);
    expect(SHOP_COPY.fr.freeDescription).toMatch(/s’équipe toute seule/);
    expect(SHOP_COPY.fr.freeInstructions).toMatch(/émeraude « Cosmétiques »/);
    // French copy speaks to the player with "tu".
    for (const key of ["coinIntro", "freeDescription", "freeInstructions"] as const) {
      expect(SHOP_COPY.fr[key]).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b/i);
    }
  });

  it("falls back safely for a future coin item without a translation", () => {
    const future = { id: "future_trail", name: "Trace future", nameEn: "Future trail", description: "Une trace pas encore traduite" };
    expect(coinItemCopy("fr", future)).toEqual({ name: "Trace future", description: "Une trace pas encore traduite" });
    expect(coinItemCopy("de", future)).toEqual({ name: "Future trail", description: "" });
    expect(coinItemCopy("hi", { ...future, nameEn: undefined })).toEqual({ name: "Trace future", description: "" });
  });

  it("preserves display data for a future catalog item until its translation is supplied", () => {
    const future = { id: "future", name: "Future item", description: "Future public description" };
    expect(shopItemCopy("fr", future)).toBe(future);
  });
});
