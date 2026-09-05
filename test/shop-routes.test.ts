import { describe, expect, it } from "vitest";
import { legacyShopRedirect } from "../utils/shop-routes";
import { COSMETIC_CATALOG, COSMETIC_PRODUCTS, isFreeCosmetic } from "../shared/cosmetics-catalog";

describe("canonical shop and free baseline", () => {
  it.each(["", "/connect?next=%2Fcosmetics%2Fhistory", "/history", "/checkout?product=supporter_monthly", "/success?session_id=cs_example", "/cancel?order=example", "#free"])("preserves legacy route suffix %s", (suffix) => {
    expect(legacyShopRedirect(`/cosmetics${suffix}`)).toBe(`/shop${suffix}`);
    expect(legacyShopRedirect(`/fr/cosmetics${suffix}`)).toBe(`/fr/shop${suffix}`);
  });
  it("does not redirect APIs, similar names, or canonical routes", () => {
    for (const path of ["/api/cosmetics/catalog", "/cosmetics-extra", "/shop", "//external.test/cosmetics"]) expect(legacyShopRedirect(path)).toBeNull();
  });
  it("offers one free item without turning any paid product into a free grant", () => {
    expect(COSMETIC_CATALOG.filter((item) => isFreeCosmetic(item.id)).map((item) => item.id)).toEqual(["cookie_sparkle_trail"]);
    expect(COSMETIC_PRODUCTS.some((product) => product.grants.some((id: string) => id === "cookie_sparkle_trail"))).toBe(false);
    expect(isFreeCosmetic("made_up_free_item")).toBe(false);
  });
});
