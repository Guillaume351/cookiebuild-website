import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { COSMETIC_PRODUCTS } from "../shared/cosmetics-catalog";
import { resolveStripePrice, stripeLookupKey, type CosmeticProduct } from "../server/utils/stripe-commerce";

function clientWithMissingGrants(product: CosmeticProduct) {
  const price = {
    id: "price_fixture", active: true, livemode: true,
    lookup_key: stripeLookupKey(product.id, product.productVersion),
    currency: "eur", unit_amount: product.priceTtcCents, tax_behavior: "inclusive",
    type: product.access === "subscription" ? "recurring" : "one_time",
    recurring: product.access === "subscription" ? { interval: "month", interval_count: 1 } : null,
    product: { id: "prod_fixture", deleted: false, metadata: {
      cookiebuild_product_id: product.id,
      cookiebuild_product_version: String(product.productVersion),
      cookiebuild_access: product.access,
      // Stripe removes metadata keys supplied as empty strings.
    } },
  };
  const client = { prices: { list: async () => ({ data: [price] }) } } as unknown as Stripe;
  return { client, price };
}

describe("live Stripe product grant metadata", () => {
  it("resolves every support-only price when Stripe omits empty grants", async () => {
    const products = COSMETIC_PRODUCTS.filter((product) => product.access === "none");
    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      const { client, price } = clientWithMissingGrants(product);
      expect(product.grants).toEqual([]);
      expect(await resolveStripePrice(client, product, "live")).toBe(price);
    }
  });

  it("rejects missing grants for every product that confers an entitlement", async () => {
    const products = COSMETIC_PRODUCTS.filter((product) => product.grants.length > 0);
    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      const { client } = clientWithMissingGrants(product);
      await expect(resolveStripePrice(client, product, "live")).rejects.toThrow("metadata does not match");
    }
  });
});
