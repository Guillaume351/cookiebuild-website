import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import catalog from "../contracts/skyblock-items-v1.json";
import {
  SKYBLOCK_CATALOG_VERSION,
  SKYBLOCK_ITEM_CATALOG,
  skyblockCatalogItem,
} from "../server/services/mobile-skyblock-catalog";
import {
  cancelListingBody,
  createListingBody,
  decodeSkyblockCursor,
  encodeSkyblockCursor,
  listingQuoteBody,
  purchaseListingBody,
  skyblockIdempotencyKey,
  skyblockMarketQuery,
} from "../server/utils/mobile-skyblock";

describe("mobile Skyblock contract", () => {
  it("publishes the versioned, bounded, earned-coin item catalog", () => {
    expect(SKYBLOCK_CATALOG_VERSION).toBe("skyblock-items-v1");
    expect(SKYBLOCK_ITEM_CATALOG).toHaveLength(12);
    expect(SKYBLOCK_ITEM_CATALOG).toEqual(catalog.items);
    expect(skyblockCatalogItem("diamond")).toMatchObject({
      category: "mining",
      rarity: "epic",
      maxStack: 64,
      minListingCoins: 10,
      maxListingCoins: 500_000,
      tradeable: true,
    });
  });

  it("accepts only exact mutation bodies and bounded integers", () => {
    expect(listingQuoteBody({
      inventoryItemId: "10000000-0000-4000-8000-000000000001",
      quantity: 32,
      priceCoins: 250,
    })).toEqual({
      inventoryItemId: "10000000-0000-4000-8000-000000000001",
      quantity: 32,
      priceCoins: 250,
    });
    expect(createListingBody({ quoteId: "20000000-0000-4000-8000-000000000001" }))
      .toEqual({ quoteId: "20000000-0000-4000-8000-000000000001" });
    expect(cancelListingBody({})).toEqual({});
    expect(purchaseListingBody({ expectedPriceCoins: 250 })).toEqual({ expectedPriceCoins: 250 });

    expect(() => listingQuoteBody({
      inventoryItemId: "10000000-0000-4000-8000-000000000001",
      quantity: 1,
      priceCoins: 10,
      sellerPlayerId: "forbidden",
    })).toThrow();
    expect(() => cancelListingBody({ reason: "free text" })).toThrow();
    expect(() => purchaseListingBody({ expectedPriceCoins: 1.5 })).toThrow();
  });

  it("requires UUID idempotency keys and rejects ambiguous query filters", () => {
    expect(skyblockIdempotencyKey("30000000-0000-4000-8000-000000000001"))
      .toBe("30000000-0000-4000-8000-000000000001");
    expect(() => skyblockIdempotencyKey(undefined)).toThrowError(expect.objectContaining({
      statusCode: 428,
      data: { code: "IDEMPOTENCY_KEY_REQUIRED" },
    }));
    expect(() => skyblockMarketQuery({ minPrice: "50", maxPrice: "10" })).toThrow();
    expect(() => skyblockMarketQuery({ sort: "random" })).toThrow();
  });

  it("round-trips opaque keyset cursors and rejects malformed input", () => {
    const cursor = encodeSkyblockCursor({
      value: "2026-08-22T12:00:00.000Z",
      id: "40000000-0000-4000-8000-000000000001",
    });
    expect(decodeSkyblockCursor(cursor)).toEqual({
      value: "2026-08-22T12:00:00.000Z",
      id: "40000000-0000-4000-8000-000000000001",
    });
    expect(() => decodeSkyblockCursor("not-json")).toThrow();
  });

  it("keeps marketplace settlement server-authoritative and independent of Stripe", async () => {
    const source = await readFile(
      new URL("../server/services/mobile-skyblock.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("skyblock_storage_items");
    expect(source).toContain("reserved_quantity");
    expect(source).toContain("skyblock_mobile_requests");
    expect(source).toContain("coin_transactions");
    expect(source).toContain('island.role !== "owner"');
    expect(source).toContain("STORAGE_CAPACITY_EXCEEDED");
    expect(source).toContain("SAME_ISLAND_PURCHASE");
    expect(source).toContain("skyblock_inventory_transfers transfer");
    expect(source).toContain("'market_seller'");
    expect(source).toContain("ORDER BY id\n     FOR UPDATE");
    expect(source).toContain("JSON.stringify(responseBody)");
    expect(source).not.toContain("stripe");
    expect(source).not.toContain("nbt");
  });

  it("requires the crash-safe inventory transfer contract before enabling the companion", async () => {
    const [schema, capabilities, exportRoute, service] = await Promise.all([
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/services/mobile-capabilities.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/api/mobile/v1/account/export.get.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/services/mobile-skyblock.ts", import.meta.url), "utf8"),
    ]);
    expect(schema).toContain('"skyblock_inventory_transfers"');
    expect(schema).toContain("uq_skyblock_open_transfer_player");
    expect(capabilities).toContain("to_regclass('public.skyblock_inventory_transfers')");
    expect(capabilities).toContain("to_regclass('public.uq_skyblock_open_transfer_player')");
    expect(exportRoute).toContain("skyblockInventoryTransferHistory");
    expect(service).toContain("FROM skyblock_inventory_transfers transfer");
  });
});
