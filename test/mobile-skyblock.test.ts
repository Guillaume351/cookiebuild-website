import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import catalog from "../contracts/skyblock-items-v2.json";
import {
  SKYBLOCK_CATALOG_VERSION,
  SKYBLOCK_ITEM_CATALOG,
  skyblockCatalogItem,
} from "../server/services/mobile-skyblock-catalog";
import {
  SKYBLOCK_LISTING_TTL_HOURS,
  SKYBLOCK_MARKET_FEE_BPS,
  skyblockMarketSettlement,
} from "../server/services/mobile-skyblock-market-policy";
import managementPolicy from "../contracts/skyblock-management-v1.json";
import {
  SKYBLOCK_MANAGEMENT_POLICY_VERSION,
  SKYBLOCK_QUESTS,
  skyblockBuildRadiusForTier,
  skyblockGeneratorUpgradeCost,
  skyblockWorkerBufferCapacity,
  skyblockWorkerIntervalSeconds,
  skyblockWorkerUpgradeCost,
} from "../server/services/mobile-skyblock-management-policy";
import {
  cancelListingBody,
  createListingBody,
  decodeSkyblockCursor,
  encodeSkyblockCursor,
  listingQuoteBody,
  merchantPurchaseBody,
  merchantSaleBody,
  objectiveClaimBody,
  emptySkyblockMutationBody,
  generatorUpgradeBody,
  purchaseListingBody,
  skyblockIdempotencyKey,
  skyblockMarketQuery,
  skyblockQuestId,
  skyblockObjectiveCadence,
  workerUpgradeBody,
} from "../server/utils/mobile-skyblock";

describe("mobile Skyblock contract", () => {
  it("publishes the versioned, bounded, earned-coin item catalog", () => {
    expect(SKYBLOCK_CATALOG_VERSION).toBe("skyblock-items-v2");
    expect(SKYBLOCK_ITEM_CATALOG).toHaveLength(14);
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
    expect(
      listingQuoteBody({
        inventoryItemId: "10000000-0000-4000-8000-000000000001",
        quantity: 32,
        priceCoins: 250,
      }),
    ).toEqual({
      inventoryItemId: "10000000-0000-4000-8000-000000000001",
      quantity: 32,
      priceCoins: 250,
    });
    expect(
      createListingBody({ quoteId: "20000000-0000-4000-8000-000000000001" }),
    ).toEqual({ quoteId: "20000000-0000-4000-8000-000000000001" });
    expect(cancelListingBody({})).toEqual({});
    expect(purchaseListingBody({ expectedPriceCoins: 250 })).toEqual({
      expectedPriceCoins: 250,
    });
    expect(
      merchantSaleBody({
        inventoryItemId: "10000000-0000-4000-8000-000000000001",
        expectedStorageVersion: 3,
        quantity: 8,
        expectedUnitPrice: 4,
      }),
    ).toEqual({
      inventoryItemId: "10000000-0000-4000-8000-000000000001",
      expectedStorageVersion: 3,
      quantity: 8,
      expectedUnitPrice: 4,
    });
    expect(
      merchantPurchaseBody({ quantity: 8, expectedUnitPrice: 10 }),
    ).toEqual({ quantity: 8, expectedUnitPrice: 10 });

    expect(() =>
      listingQuoteBody({
        inventoryItemId: "10000000-0000-4000-8000-000000000001",
        quantity: 1,
        priceCoins: 10,
        sellerPlayerId: "forbidden",
      }),
    ).toThrow();
    expect(() => cancelListingBody({ reason: "free text" })).toThrow();
    expect(() => purchaseListingBody({ expectedPriceCoins: 1.5 })).toThrow();
    expect(() =>
      merchantPurchaseBody({
        quantity: 1,
        expectedUnitPrice: 10,
        itemId: "coal",
      }),
    ).toThrow();
  });

  it("matches the gameplay market fee, duration and positive-proceeds rules", () => {
    expect(SKYBLOCK_MARKET_FEE_BPS).toBe(500);
    expect(SKYBLOCK_LISTING_TTL_HOURS).toBe(48);
    expect(skyblockMarketSettlement(240)).toEqual({
      feeCoins: 12,
      netCoins: 228,
    });
    expect(skyblockMarketSettlement(21)).toEqual({ feeCoins: 2, netCoins: 19 });
    expect(() => skyblockMarketSettlement(1)).toThrowError(
      expect.objectContaining({
        statusCode: 400,
        data: { code: "INVALID_REQUEST" },
      }),
    );
  });

  it("publishes strict versioned management, generator, worker and quest policies", () => {
    expect(SKYBLOCK_MANAGEMENT_POLICY_VERSION).toBe("skyblock-management-v1");
    expect(SKYBLOCK_QUESTS).toEqual(managementPolicy.quests);
    expect(SKYBLOCK_QUESTS).toHaveLength(12);
    expect(skyblockBuildRadiusForTier(1)).toBe(96);
    expect(skyblockBuildRadiusForTier(5)).toBe(160);
    expect(skyblockGeneratorUpgradeCost(2)).toBe(250);
    expect(skyblockGeneratorUpgradeCost(5)).toBe(5_000);
    expect(skyblockWorkerUpgradeCost(2)).toBe(250);
    expect(skyblockWorkerUpgradeCost(5)).toBe(4_000);
    expect(skyblockWorkerBufferCapacity(5)).toBe(1_280);
    expect(skyblockWorkerIntervalSeconds(5)).toBe(27);
  });

  it("accepts no identity or unversioned state in management mutation bodies", () => {
    expect(
      generatorUpgradeBody({
        expectedIslandVersion: 4,
        expectedNextTier: 3,
        expectedCostCoins: 750,
      }),
    ).toEqual({
      expectedIslandVersion: 4,
      expectedNextTier: 3,
      expectedCostCoins: 750,
    });
    expect(emptySkyblockMutationBody({})).toEqual({});
    expect(skyblockQuestId("generator_apprentice")).toBe(
      "generator_apprentice",
    );
    expect(() =>
      generatorUpgradeBody({
        expectedIslandVersion: 4,
        expectedNextTier: 3,
        expectedCostCoins: 750,
        playerId: "forbidden",
      }),
    ).toThrow();
    expect(() =>
      emptySkyblockMutationBody({ playerId: "forbidden" }),
    ).toThrow();
    expect(() => skyblockQuestId("../first_cobble")).toThrow();
    expect(
      workerUpgradeBody({
        expectedTier: 2,
        expectedNextTier: 3,
        expectedCostCoins: 750,
      }),
    ).toEqual({ expectedTier: 2, expectedNextTier: 3, expectedCostCoins: 750 });
    expect(() =>
      workerUpgradeBody({
        expectedTier: 2,
        expectedNextTier: 4,
        expectedCostCoins: 1_800,
      }),
    ).toThrow();
    expect(skyblockObjectiveCadence("weekly")).toBe("weekly");
    expect(
      objectiveClaimBody({
        objectiveId: "weekly_worker",
        periodStart: "2026-08-24",
      }),
    ).toEqual({ objectiveId: "weekly_worker", periodStart: "2026-08-24" });
    expect(() =>
      objectiveClaimBody({
        objectiveId: "weekly_worker",
        periodStart: "24-08-2026",
      }),
    ).toThrow();
  });

  it("requires UUID idempotency keys and rejects ambiguous query filters", () => {
    expect(skyblockIdempotencyKey("30000000-0000-4000-8000-000000000001")).toBe(
      "30000000-0000-4000-8000-000000000001",
    );
    expect(() => skyblockIdempotencyKey(undefined)).toThrowError(
      expect.objectContaining({
        statusCode: 428,
        data: { code: "IDEMPOTENCY_KEY_REQUIRED" },
      }),
    );
    expect(() =>
      skyblockMarketQuery({ minPrice: "50", maxPrice: "10" }),
    ).toThrow();
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
    expect(source).toContain("skyblock_island_accounts");
    expect(source).toContain("skyblock_coin_transactions");
    expect(source).toContain("skyblock_npc_trade_daily");
    expect(source).toContain("skyblock_collections");
    expect(source).toContain("skyblock_periodic_objectives");
    expect(source).toContain("WORKER_UPGRADE_CHANGED");
    expect(source).toContain("skyblock_market_sold");
    expect(source).toContain(
      'island.role !== "owner" && island.role !== "manager"',
    );
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
      readFile(
        new URL("../server/services/mobile-capabilities.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../server/api/mobile/v1/account/export.get.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../server/services/mobile-skyblock.ts", import.meta.url),
        "utf8",
      ),
    ]);
    expect(schema).toContain('"skyblock_inventory_transfers"');
    expect(schema).toContain("uq_skyblock_open_transfer_player");
    expect(capabilities).toContain(
      "to_regclass('public.skyblock_inventory_transfers')",
    );
    expect(capabilities).toContain(
      "to_regclass('public.uq_skyblock_open_transfer_player')",
    );
    expect(exportRoute).toContain("skyblockInventoryTransferHistory");
    expect(exportRoute).toContain("skyblockManagementOverview");
    expect(service).toContain("FROM skyblock_inventory_transfers transfer");
  });
});
