import { readFile } from "node:fs/promises";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const databaseUrl = process.env.MOBILE_SKYBLOCK_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

const SELLER = "10000000-0000-4000-8000-000000000001";
const BUYER = "20000000-0000-4000-8000-000000000001";
const BUYER_TWO = "80000000-0000-4000-8000-000000000001";
const MANAGER = "a0000000-0000-4000-8000-000000000001";
const SELLER_ISLAND = "30000000-0000-4000-8000-000000000001";
const BUYER_ISLAND = "40000000-0000-4000-8000-000000000001";
const BUYER_TWO_ISLAND = "90000000-0000-4000-8000-000000000001";
const STORAGE = "50000000-0000-4000-8000-000000000001";
const SELLER_UID = "skyblock-integration-seller";
const BUYER_UID = "skyblock-integration-buyer";
const BUYER_TWO_UID = "skyblock-integration-buyer-two";
const MANAGER_UID = "skyblock-integration-manager";
const CREATE_KEY = "60000000-0000-4000-8000-000000000001";
const PURCHASE_KEY = "70000000-0000-4000-8000-000000000001";

integration("mobile Skyblock marketplace transactions", () => {
  let setupSql: Sql;
  let databaseModule: typeof import("../db/client");
  let skyblock: typeof import("../server/services/mobile-skyblock");
  let capabilities: typeof import("../server/services/mobile-capabilities");

  beforeAll(async () => {
    process.env.NUXT_DATABASE_URL = databaseUrl!;
    setupSql = postgres(databaseUrl!, { prepare: false, max: 1 });
    await setupSql.unsafe(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      CREATE TABLE playerdata (
        id uuid PRIMARY KEY,
        name varchar(255),
        coins integer NOT NULL DEFAULT 0
      );
      CREATE TABLE coin_transactions (
        id uuid PRIMARY KEY,
        player_id uuid NOT NULL REFERENCES playerdata(id),
        amount integer NOT NULL,
        source varchar(180) NOT NULL,
        created_at timestamp NOT NULL,
        CONSTRAINT uq_coin_transaction_player_source UNIQUE (player_id, source)
      );
    `);
    const foundation = await readFile(
      new URL("../drizzle/0001_mobile_foundation.sql", import.meta.url),
      "utf8",
    );
    await setupSql.unsafe(foundation);
    const skyblockMigration = (await readFile(
      new URL("../../Cookies/ops/add-skyblock-v1.sql", import.meta.url),
      "utf8",
    )).replace(/^\\set[^\n]*\n/m, "");
    await setupSql.unsafe(skyblockMigration);
    await setupSql.unsafe(skyblockMigration);

    databaseModule = await import("../db/client");
    skyblock = await import("../server/services/mobile-skyblock");
    capabilities = await import("../server/services/mobile-capabilities");
  }, 30_000);

  beforeEach(async () => {
    await setupSql.unsafe("TRUNCATE mobile_users, playerdata CASCADE");
    await setupSql`
      INSERT INTO playerdata (id, name, coins) VALUES
        (${SELLER}, 'SellerCookie', 100),
        (${BUYER}, 'BuyerCookie', 1000),
        (${BUYER_TWO}, 'BuyerCookieTwo', 1000),
        (${MANAGER}, 'ManagerCookie', 1000)
    `;
    await setupSql`
      INSERT INTO mobile_users (firebase_uid) VALUES
        (${SELLER_UID}), (${BUYER_UID}), (${BUYER_TWO_UID}), (${MANAGER_UID})
    `;
    await setupSql`
      INSERT INTO mobile_player_links (firebase_uid, player_id, edition, is_primary) VALUES
        (${SELLER_UID}, ${SELLER}, 'java', true),
        (${BUYER_UID}, ${BUYER}, 'bedrock', true),
        (${BUYER_TWO_UID}, ${BUYER_TWO}, 'java', true),
        (${MANAGER_UID}, ${MANAGER}, 'java', true)
    `;
    await setupSql`
      INSERT INTO skyblock_islands
        (id, owner_player_id, name, state, grid_x, grid_z, template_version)
      VALUES
        (${SELLER_ISLAND}, ${SELLER}, 'Seller Island', 'active', 1, 1, 'skyblock-v1'),
        (${BUYER_ISLAND}, ${BUYER}, 'Buyer Island', 'active', 2, 1, 'skyblock-v1'),
        (${BUYER_TWO_ISLAND}, ${BUYER_TWO}, 'Buyer Two Island', 'active', 3, 1, 'skyblock-v1')
    `;
    await setupSql`
      INSERT INTO skyblock_island_members (island_id, player_id, role) VALUES
        (${SELLER_ISLAND}, ${SELLER}, 'owner'),
        (${SELLER_ISLAND}, ${MANAGER}, 'manager'),
        (${BUYER_ISLAND}, ${BUYER}, 'owner'),
        (${BUYER_TWO_ISLAND}, ${BUYER_TWO}, 'owner')
    `;
    await setupSql`
      INSERT INTO skyblock_storage_items
        (id, owner_player_id, island_id, item_id, quantity, reserved_quantity, version)
      VALUES (${STORAGE}, ${SELLER}, ${SELLER_ISLAND}, 'coal', 100, 0, 0)
    `;
  });

  afterAll(async () => {
    await databaseModule?.postgresClient.end({ timeout: 2 });
    await setupSql?.end({ timeout: 2 });
  });

  async function listedCoal(createKey = CREATE_KEY) {
    const quote = await skyblock.createSkyblockListingQuote(SELLER_UID, {
      inventoryItemId: STORAGE,
      quantity: 10,
      priceCoins: 100,
    });
    const listing = await skyblock.createSkyblockListing(
      SELLER_UID,
      { quoteId: quote.quoteId },
      createKey,
    );
    return { quote, listingId: String(listing.data.listingId) };
  }

  it("fails the companion capability closed without the open-transfer invariant", async () => {
    process.env.MOBILE_SKYBLOCK_ENABLED = "true";
    process.env.MOBILE_SKYBLOCK_MARKET_WRITES_ENABLED = "true";
    let indexDropped = false;
    try {
      capabilities.resetMobileCapabilityCacheForTests();
      await expect(capabilities.mobileCapabilities()).resolves.toMatchObject({
        skyblockCompanion: true,
        skyblockMarketWrites: true,
      });

      await setupSql.unsafe("DROP INDEX uq_skyblock_open_transfer_player");
      indexDropped = true;
      capabilities.resetMobileCapabilityCacheForTests();
      await expect(capabilities.mobileCapabilities()).resolves.toMatchObject({
        skyblockCompanion: false,
        skyblockMarketWrites: false,
      });
    } finally {
      if (indexDropped) {
        await setupSql.unsafe(`
          CREATE UNIQUE INDEX IF NOT EXISTS uq_skyblock_open_transfer_player
            ON skyblock_inventory_transfers (player_id)
            WHERE state IN ('prepared', 'marked')
        `);
      }
      delete process.env.MOBILE_SKYBLOCK_ENABLED;
      delete process.env.MOBILE_SKYBLOCK_MARKET_WRITES_ENABLED;
      capabilities.resetMobileCapabilityCacheForTests();
    }
  });

  it("exports only privacy-safe inventory transfer history", async () => {
    const transferId = "51000000-0000-4000-8000-000000000001";
    await setupSql`
      INSERT INTO skyblock_inventory_transfers
        (id, player_id, island_id, inventory_slot, item_id, quantity, state, committed_at)
      VALUES
        (${transferId}, ${SELLER}, ${SELLER_ISLAND}, 7, 'coal', 12, 'committed', now())
    `;

    const history = await skyblock.skyblockInventoryTransferHistory(SELLER_UID);
    expect(history).toEqual([{
      transferId,
      item: { itemId: "coal", name: "Coal", category: "mining", rarity: "common" },
      quantity: 12,
      state: "committed",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      committedAt: expect.any(String),
    }]);
    expect(history[0]).not.toHaveProperty("inventorySlot");
    expect(history[0]).not.toHaveProperty("playerId");
    expect(history[0]).not.toHaveProperty("islandId");
  });

  it("allows only the island owner to sell shared storage", async () => {
    await expect(skyblock.createSkyblockListingQuote(MANAGER_UID, {
      inventoryItemId: STORAGE,
      quantity: 10,
      priceCoins: 100,
    })).rejects.toMatchObject({
      statusCode: 403,
      data: { code: "ISLAND_OWNER_REQUIRED" },
    });
    const [state] = await setupSql<{ quotes: number; reserved: number }[]>`
      SELECT
        (SELECT count(*)::int FROM skyblock_market_quotes) AS quotes,
        (SELECT reserved_quantity::int FROM skyblock_storage_items WHERE id = ${STORAGE}) AS reserved
    `;
    expect(state).toEqual({ quotes: 0, reserved: 0 });
  });

  it("rejects a purchase within the same coop without moving items or coins", async () => {
    const { listingId } = await listedCoal("64000000-0000-4000-8000-000000000001");
    await expect(skyblock.purchaseSkyblockListing(
      MANAGER_UID,
      listingId,
      { expectedPriceCoins: 100 },
      "76000000-0000-4000-8000-000000000001",
    )).rejects.toMatchObject({
      statusCode: 409,
      data: { code: "SAME_ISLAND_PURCHASE" },
    });
    const [state] = await setupSql<{
      listingStatus: string;
      sellerCoins: number;
      managerCoins: number;
      quantity: number;
      reserved: number;
      sales: number;
      ledgerRows: number;
      purchaseRequests: number;
    }[]>`
      SELECT
        (SELECT status FROM skyblock_market_listings WHERE id = ${listingId}) AS "listingStatus",
        (SELECT coins FROM playerdata WHERE id = ${SELLER}) AS "sellerCoins",
        (SELECT coins FROM playerdata WHERE id = ${MANAGER}) AS "managerCoins",
        (SELECT quantity::int FROM skyblock_storage_items WHERE id = ${STORAGE}) AS quantity,
        (SELECT reserved_quantity::int FROM skyblock_storage_items WHERE id = ${STORAGE}) AS reserved,
        (SELECT count(*)::int FROM skyblock_market_sales) AS sales,
        (SELECT count(*)::int FROM coin_transactions) AS "ledgerRows",
        (SELECT count(*)::int FROM skyblock_mobile_requests
          WHERE scope LIKE '%:purchase') AS "purchaseRequests"
    `;
    expect(state).toEqual({
      listingStatus: "active",
      sellerCoins: 100,
      managerCoins: 1000,
      quantity: 100,
      reserved: 10,
      sales: 0,
      ledgerRows: 0,
      purchaseRequests: 0,
    });
  });

  it("reserves storage capacity for open deposits before accepting a purchase", async () => {
    const { listingId } = await listedCoal("65000000-0000-4000-8000-000000000001");
    await setupSql`UPDATE skyblock_islands SET storage_capacity = 20 WHERE id = ${BUYER_ISLAND}`;
    await setupSql`
      INSERT INTO skyblock_storage_items
        (id, owner_player_id, island_id, item_id, quantity, reserved_quantity, version)
      VALUES
        ('53000000-0000-4000-8000-000000000001', ${BUYER}, ${BUYER_ISLAND}, 'wheat', 5, 0, 0)
    `;
    await setupSql`
      INSERT INTO skyblock_inventory_transfers
        (id, player_id, island_id, inventory_slot, item_id, quantity, state)
      VALUES
        ('52000000-0000-4000-8000-000000000001', ${BUYER}, ${BUYER_ISLAND}, 8, 'iron_ingot', 6, 'prepared')
    `;

    await expect(skyblock.purchaseSkyblockListing(
      BUYER_UID,
      listingId,
      { expectedPriceCoins: 100 },
      "77000000-0000-4000-8000-000000000001",
    )).rejects.toMatchObject({
      statusCode: 409,
      data: { code: "STORAGE_CAPACITY_EXCEEDED" },
    });
    const [state] = await setupSql<{
      listingStatus: string;
      buyerCoins: number;
      sellerCoins: number;
      quantity: number;
      reserved: number;
      sales: number;
      ledgerRows: number;
      transfers: number;
      purchaseRequests: number;
      buyerStored: number;
    }[]>`
      SELECT
        (SELECT status FROM skyblock_market_listings WHERE id = ${listingId}) AS "listingStatus",
        (SELECT coins FROM playerdata WHERE id = ${BUYER}) AS "buyerCoins",
        (SELECT coins FROM playerdata WHERE id = ${SELLER}) AS "sellerCoins",
        (SELECT quantity::int FROM skyblock_storage_items WHERE id = ${STORAGE}) AS quantity,
        (SELECT reserved_quantity::int FROM skyblock_storage_items WHERE id = ${STORAGE}) AS reserved,
        (SELECT count(*)::int FROM skyblock_market_sales) AS sales,
        (SELECT count(*)::int FROM coin_transactions) AS "ledgerRows",
        (SELECT count(*)::int FROM skyblock_inventory_transfers WHERE state = 'prepared') AS transfers,
        (SELECT count(*)::int FROM skyblock_mobile_requests
          WHERE scope LIKE '%:purchase') AS "purchaseRequests",
        (SELECT quantity::int FROM skyblock_storage_items
          WHERE island_id = ${BUYER_ISLAND} AND item_id = 'wheat') AS "buyerStored"
    `;
    expect(state).toEqual({
      listingStatus: "active",
      buyerCoins: 1000,
      sellerCoins: 100,
      quantity: 100,
      reserved: 10,
      sales: 0,
      ledgerRows: 0,
      transfers: 1,
      purchaseRequests: 0,
      buyerStored: 5,
    });
  });

  it("creates and settles exactly once under concurrent mobile retries", async () => {
    const quote = await skyblock.createSkyblockListingQuote(SELLER_UID, {
      inventoryItemId: STORAGE,
      quantity: 10,
      priceCoins: 100,
    });
    expect(quote).toMatchObject({
      inventoryItemId: STORAGE,
      itemId: "coal",
      quantity: 10,
      priceCoins: 100,
      feeCoins: 5,
      netCoins: 95,
      inventoryRevision: 0,
    });

    const created = await Promise.all([
      skyblock.createSkyblockListing(SELLER_UID, { quoteId: quote.quoteId }, CREATE_KEY),
      skyblock.createSkyblockListing(SELLER_UID, { quoteId: quote.quoteId }, CREATE_KEY),
    ]);
    expect(created.map((result) => result.created).sort()).toEqual([false, true]);
    const listingId = String(created[0]!.data.listingId);
    expect(created[1]!.data).toEqual(created[0]!.data);

    const purchased = await Promise.all([
      skyblock.purchaseSkyblockListing(BUYER_UID, listingId, { expectedPriceCoins: 100 }, PURCHASE_KEY),
      skyblock.purchaseSkyblockListing(BUYER_UID, listingId, { expectedPriceCoins: 100 }, PURCHASE_KEY),
    ]);
    expect(purchased.map((result) => result.created).sort()).toEqual([false, true]);
    expect(purchased[1]!.data).toEqual(purchased[0]!.data);

    const [state] = await setupSql<{
      buyerCoins: number;
      sellerCoins: number;
      sellerQuantity: number;
      sellerReserved: number;
      buyerQuantity: number;
      listings: number;
      sales: number;
      ledgerRows: number;
      requests: number;
      jsonResponses: number;
      questProgress: number;
      questCompleted: boolean;
      questClaimed: boolean;
    }[]>`
      SELECT
        (SELECT coins FROM playerdata WHERE id = ${BUYER}) AS "buyerCoins",
        (SELECT coins FROM playerdata WHERE id = ${SELLER}) AS "sellerCoins",
        (SELECT quantity::int FROM skyblock_storage_items WHERE id = ${STORAGE}) AS "sellerQuantity",
        (SELECT reserved_quantity::int FROM skyblock_storage_items WHERE id = ${STORAGE}) AS "sellerReserved",
        (SELECT quantity::int FROM skyblock_storage_items
          WHERE island_id = ${BUYER_ISLAND} AND item_id = 'coal') AS "buyerQuantity",
        (SELECT count(*)::int FROM skyblock_market_listings) AS listings,
        (SELECT count(*)::int FROM skyblock_market_sales) AS sales,
        (SELECT count(*)::int FROM coin_transactions) AS "ledgerRows",
        (SELECT count(*)::int FROM skyblock_mobile_requests) AS requests,
        (SELECT count(*)::int FROM skyblock_mobile_requests
          WHERE jsonb_typeof(response_body) = 'object') AS "jsonResponses",
        (SELECT progress FROM skyblock_quest_progress
          WHERE player_id = ${SELLER} AND quest_id = 'market_seller') AS "questProgress",
        (SELECT completed_at IS NOT NULL FROM skyblock_quest_progress
          WHERE player_id = ${SELLER} AND quest_id = 'market_seller') AS "questCompleted",
        (SELECT claimed_at IS NOT NULL FROM skyblock_quest_progress
          WHERE player_id = ${SELLER} AND quest_id = 'market_seller') AS "questClaimed"
    `;
    expect(state).toEqual({
      buyerCoins: 900,
      sellerCoins: 195,
      sellerQuantity: 90,
      sellerReserved: 0,
      buyerQuantity: 10,
      listings: 1,
      sales: 1,
      ledgerRows: 2,
      requests: 2,
      jsonResponses: 2,
      questProgress: 1,
      questCompleted: true,
      questClaimed: false,
    });
  });

  it("allows only one of two concurrent buyers to settle the same listing", async () => {
    const { listingId } = await listedCoal("61000000-0000-4000-8000-000000000001");
    const outcomes = await Promise.allSettled([
      skyblock.purchaseSkyblockListing(
        BUYER_UID,
        listingId,
        { expectedPriceCoins: 100 },
        "71000000-0000-4000-8000-000000000001",
      ),
      skyblock.purchaseSkyblockListing(
        BUYER_TWO_UID,
        listingId,
        { expectedPriceCoins: 100 },
        "72000000-0000-4000-8000-000000000001",
      ),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(1);

    const [state] = await setupSql<{
      status: string;
      sales: number;
      ledgerRows: number;
      sellerCoins: number;
      buyerCoins: number;
      buyerTwoCoins: number;
      deliveredQuantity: number;
    }[]>`
      SELECT
        (SELECT status FROM skyblock_market_listings WHERE id = ${listingId}) AS status,
        (SELECT count(*)::int FROM skyblock_market_sales WHERE listing_id = ${listingId}) AS sales,
        (SELECT count(*)::int FROM coin_transactions) AS "ledgerRows",
        (SELECT coins FROM playerdata WHERE id = ${SELLER}) AS "sellerCoins",
        (SELECT coins FROM playerdata WHERE id = ${BUYER}) AS "buyerCoins",
        (SELECT coins FROM playerdata WHERE id = ${BUYER_TWO}) AS "buyerTwoCoins",
        (SELECT COALESCE(sum(quantity), 0)::int FROM skyblock_storage_items
          WHERE island_id IN (${BUYER_ISLAND}, ${BUYER_TWO_ISLAND}) AND item_id = 'coal') AS "deliveredQuantity"
    `;
    expect(state).toMatchObject({
      status: "sold",
      sales: 1,
      ledgerRows: 2,
      sellerCoins: 195,
      deliveredQuantity: 10,
    });
    expect([state!.buyerCoins, state!.buyerTwoCoins].sort((left, right) => left - right)).toEqual([900, 1000]);
  });

  it("makes purchase versus cancellation choose one terminal state without losing stock", async () => {
    const { listingId } = await listedCoal("62000000-0000-4000-8000-000000000001");
    const outcomes = await Promise.allSettled([
      skyblock.purchaseSkyblockListing(
        BUYER_UID,
        listingId,
        { expectedPriceCoins: 100 },
        "73000000-0000-4000-8000-000000000001",
      ),
      skyblock.cancelSkyblockListing(
        SELLER_UID,
        listingId,
        "74000000-0000-4000-8000-000000000001",
      ),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(1);

    const [state] = await setupSql<{
      status: "sold" | "cancelled";
      sellerQuantity: number;
      sellerReserved: number;
      buyerQuantity: number;
      sales: number;
      ledgerRows: number;
    }[]>`
      SELECT
        (SELECT status FROM skyblock_market_listings WHERE id = ${listingId}) AS status,
        (SELECT quantity::int FROM skyblock_storage_items WHERE id = ${STORAGE}) AS "sellerQuantity",
        (SELECT reserved_quantity::int FROM skyblock_storage_items WHERE id = ${STORAGE}) AS "sellerReserved",
        (SELECT COALESCE(sum(quantity), 0)::int FROM skyblock_storage_items
          WHERE island_id = ${BUYER_ISLAND} AND item_id = 'coal') AS "buyerQuantity",
        (SELECT count(*)::int FROM skyblock_market_sales) AS sales,
        (SELECT count(*)::int FROM coin_transactions) AS "ledgerRows"
    `;
    expect(state!.sellerReserved).toBe(0);
    if (state!.status === "sold") {
      expect(state).toMatchObject({ sellerQuantity: 90, buyerQuantity: 10, sales: 1, ledgerRows: 2 });
    } else {
      expect(state).toMatchObject({ sellerQuantity: 100, buyerQuantity: 0, sales: 0, ledgerRows: 0 });
    }
  });

  it("rejects insufficient coins without changing listing, reservation, or ledgers", async () => {
    const { listingId } = await listedCoal("63000000-0000-4000-8000-000000000001");
    await setupSql`UPDATE playerdata SET coins = 50 WHERE id = ${BUYER}`;

    await expect(skyblock.purchaseSkyblockListing(
      BUYER_UID,
      listingId,
      { expectedPriceCoins: 100 },
      "75000000-0000-4000-8000-000000000001",
    )).rejects.toMatchObject({
      statusCode: 409,
      data: { code: "INSUFFICIENT_COINS" },
    });

    const [state] = await setupSql<{
      status: string;
      buyerCoins: number;
      sellerCoins: number;
      quantity: number;
      reserved: number;
      sales: number;
      ledgerRows: number;
    }[]>`
      SELECT
        (SELECT status FROM skyblock_market_listings WHERE id = ${listingId}) AS status,
        (SELECT coins FROM playerdata WHERE id = ${BUYER}) AS "buyerCoins",
        (SELECT coins FROM playerdata WHERE id = ${SELLER}) AS "sellerCoins",
        (SELECT quantity::int FROM skyblock_storage_items WHERE id = ${STORAGE}) AS quantity,
        (SELECT reserved_quantity::int FROM skyblock_storage_items WHERE id = ${STORAGE}) AS reserved,
        (SELECT count(*)::int FROM skyblock_market_sales) AS sales,
        (SELECT count(*)::int FROM coin_transactions) AS "ledgerRows"
    `;
    expect(state).toEqual({
      status: "active",
      buyerCoins: 50,
      sellerCoins: 100,
      quantity: 100,
      reserved: 10,
      sales: 0,
      ledgerRows: 0,
    });
  });
});
