import { readFile } from "node:fs/promises";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const databaseUrl = process.env.MOBILE_SKYBLOCK_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

const SELLER = "10000000-0000-4000-8000-000000000001";
const BUYER = "20000000-0000-4000-8000-000000000001";
const BUYER_TWO = "80000000-0000-4000-8000-000000000001";
const MANAGER = "a0000000-0000-4000-8000-000000000001";
const INVITEE = "b0000000-0000-4000-8000-000000000001";
const SELLER_ISLAND = "30000000-0000-4000-8000-000000000001";
const BUYER_ISLAND = "40000000-0000-4000-8000-000000000001";
const BUYER_TWO_ISLAND = "90000000-0000-4000-8000-000000000001";
const STORAGE = "50000000-0000-4000-8000-000000000001";
const SELLER_UID = "skyblock-integration-seller";
const BUYER_UID = "skyblock-integration-buyer";
const BUYER_TWO_UID = "skyblock-integration-buyer-two";
const MANAGER_UID = "skyblock-integration-manager";
const INVITEE_UID = "skyblock-integration-invitee";
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
        (${MANAGER}, 'ManagerCookie', 1000),
        (${INVITEE}, 'InviteeCookie', 1000)
    `;
    await setupSql`
      INSERT INTO mobile_users (firebase_uid) VALUES
        (${SELLER_UID}), (${BUYER_UID}), (${BUYER_TWO_UID}), (${MANAGER_UID}), (${INVITEE_UID})
    `;
    await setupSql`
      INSERT INTO mobile_player_links (firebase_uid, player_id, edition, is_primary) VALUES
        (${SELLER_UID}, ${SELLER}, 'java', true),
        (${BUYER_UID}, ${BUYER}, 'bedrock', true),
        (${BUYER_TWO_UID}, ${BUYER_TWO}, 'java', true),
        (${MANAGER_UID}, ${MANAGER}, 'java', true),
        (${INVITEE_UID}, ${INVITEE}, 'bedrock', true)
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
    process.env.MOBILE_SKYBLOCK_MANAGEMENT_WRITES_ENABLED = "true";
    process.env.MOBILE_SKYBLOCK_MARKET_WRITES_ENABLED = "true";
    let indexDropped = false;
    try {
      capabilities.resetMobileCapabilityCacheForTests();
      await expect(capabilities.mobileCapabilities()).resolves.toMatchObject({
        skyblockCompanion: true,
        skyblockManagementWrites: true,
        skyblockMarketWrites: true,
      });

      await setupSql.unsafe("DROP INDEX uq_skyblock_open_transfer_player");
      indexDropped = true;
      capabilities.resetMobileCapabilityCacheForTests();
      await expect(capabilities.mobileCapabilities()).resolves.toMatchObject({
        skyblockCompanion: false,
        skyblockManagementWrites: false,
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
      delete process.env.MOBILE_SKYBLOCK_MANAGEMENT_WRITES_ENABLED;
      delete process.env.MOBILE_SKYBLOCK_MARKET_WRITES_ENABLED;
      capabilities.resetMobileCapabilityCacheForTests();
    }
  });

  it("fails management writes closed independently when the coop invite invariant is absent", async () => {
    process.env.MOBILE_SKYBLOCK_ENABLED = "true";
    process.env.MOBILE_SKYBLOCK_MANAGEMENT_WRITES_ENABLED = "true";
    process.env.MOBILE_SKYBLOCK_MARKET_WRITES_ENABLED = "true";
    let indexDropped = false;
    try {
      await setupSql.unsafe("DROP INDEX uq_skyblock_pending_invite");
      indexDropped = true;
      capabilities.resetMobileCapabilityCacheForTests();
      await expect(capabilities.mobileCapabilities()).resolves.toMatchObject({
        skyblockCompanion: true,
        skyblockManagementWrites: false,
        skyblockMarketWrites: true,
      });
    } finally {
      if (indexDropped) {
        await setupSql.unsafe(`
          CREATE UNIQUE INDEX IF NOT EXISTS uq_skyblock_pending_invite
            ON skyblock_island_invites (island_id, invitee_player_id)
            WHERE status = 'pending'
        `);
      }
      delete process.env.MOBILE_SKYBLOCK_ENABLED;
      delete process.env.MOBILE_SKYBLOCK_MANAGEMENT_WRITES_ENABLED;
      delete process.env.MOBILE_SKYBLOCK_MARKET_WRITES_ENABLED;
      capabilities.resetMobileCapabilityCacheForTests();
    }
  });

  it("fails every Skyblock capability closed when the global coin balance column is absent", async () => {
    process.env.MOBILE_SKYBLOCK_ENABLED = "true";
    process.env.MOBILE_SKYBLOCK_MANAGEMENT_WRITES_ENABLED = "true";
    process.env.MOBILE_SKYBLOCK_MARKET_WRITES_ENABLED = "true";
    let columnDropped = false;
    try {
      await setupSql.unsafe("ALTER TABLE playerdata DROP COLUMN coins");
      columnDropped = true;
      capabilities.resetMobileCapabilityCacheForTests();
      await expect(capabilities.mobileCapabilities()).resolves.toMatchObject({
        skyblockCompanion: false,
        skyblockManagementWrites: false,
        skyblockMarketWrites: false,
      });
    } finally {
      if (columnDropped) {
        await setupSql.unsafe("ALTER TABLE playerdata ADD COLUMN coins integer NOT NULL DEFAULT 0");
      }
      delete process.env.MOBILE_SKYBLOCK_ENABLED;
      delete process.env.MOBILE_SKYBLOCK_MANAGEMENT_WRITES_ENABLED;
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

  it("returns stable empty overview and management shapes for a linked player without an island", async () => {
    const overview = await skyblock.skyblockOverview(INVITEE_UID, false);
    expect(overview.island).toBeNull();
    expect(Object.keys(overview).filter((key) => key === "inventorySummary")).toHaveLength(1);
    expect(overview.inventorySummary).toEqual({ stacks: 0, totalItems: 0, capacity: 0 });

    const management = await skyblock.skyblockManagementOverview(INVITEE_UID, true);
    expect(management).toMatchObject({
      schemaVersion: 1,
      policyVersion: "skyblock-management-v1",
      managementWritesEnabled: true,
      island: null,
      generator: null,
      workers: [],
      quests: [],
      coop: { members: [], pendingInvite: null },
    });
  });

  it("returns one coherent management aggregate for an active coop member", async () => {
    await setupSql`
      INSERT INTO skyblock_workers
        (id, island_id, worker_type, tier, status, buffer_item_id, buffer_quantity, production_cursor_at)
      VALUES
        ('99000000-0000-4000-8000-000000000001', ${SELLER_ISLAND}, 'miner', 1,
         'active', 'cobblestone', 2, now() - interval '160 seconds')
    `;
    await setupSql`
      INSERT INTO skyblock_quest_progress (player_id, quest_id, progress, completed_at)
      VALUES (${SELLER}, 'first_cobble', 16, now())
    `;
    const management = await skyblock.skyblockManagementOverview(SELLER_UID, true);
    expect(management).toMatchObject({
      policyVersion: "skyblock-management-v1",
      player: { playerId: SELLER, playerName: "SellerCookie", coins: 100 },
      island: {
        islandId: SELLER_ISLAND,
        role: "owner",
        version: 0,
        generatorTier: 1,
        buildRadius: 96,
        storage: { usedItems: 100, reservedTransfers: 0, capacity: 2304 },
        memberLimit: 4,
        visibility: "invite_only",
      },
      generator: {
        tier: 1,
        maxTier: 5,
        nextUpgrade: { tier: 2, costCoins: 250, buildRadius: 112 },
        canUpgrade: false,
      },
      workers: [expect.objectContaining({
        workerId: "99000000-0000-4000-8000-000000000001",
        type: "miner",
        tier: 1,
        status: "active",
        bufferQuantity: 2,
      })],
      coop: {
        members: expect.arrayContaining([
          expect.objectContaining({ playerId: SELLER, role: "owner" }),
          expect.objectContaining({ playerId: MANAGER, role: "manager" }),
        ]),
        pendingInvite: null,
      },
    });
    expect(management.workers[0]!.estimatedReadyQuantity).toBeGreaterThanOrEqual(4);
    expect(management.quests).toHaveLength(12);
    expect(management.quests.find((quest) => quest.questId === "first_cobble"))
      .toMatchObject({ completed: true, claimed: false, claimable: true, rewardCoins: 15 });
  });

  it("upgrades a generator once under a concurrent idempotent retry", async () => {
    await setupSql`UPDATE playerdata SET coins = 1000 WHERE id = ${SELLER}`;
    const input = { expectedIslandVersion: 0, expectedNextTier: 2, expectedCostCoins: 250 };
    const key = "81000000-0000-4000-8000-000000000001";
    const results = await Promise.all([
      skyblock.upgradeSkyblockGenerator(SELLER_UID, input, key),
      skyblock.upgradeSkyblockGenerator(SELLER_UID, input, key),
    ]);
    expect(results.map((result) => result.created).sort()).toEqual([false, true]);
    expect(results[0]!.data).toEqual(results[1]!.data);
    expect(results[0]!.data).toMatchObject({
      island: { version: 1, level: 2, experience: 250, generatorTier: 2, buildRadius: 112 },
      coins: 750,
      costCoins: 250,
      questCompletions: ["generator_apprentice"],
    });
    const [state] = await setupSql<{
      tier: number;
      radius: number;
      coins: number;
      ledgerRows: number;
      requests: number;
      questProgress: number;
      completed: boolean;
    }[]>`
      SELECT
        (SELECT generator_tier FROM skyblock_islands WHERE id = ${SELLER_ISLAND}) AS tier,
        (SELECT build_radius FROM skyblock_islands WHERE id = ${SELLER_ISLAND}) AS radius,
        (SELECT coins FROM playerdata WHERE id = ${SELLER}) AS coins,
        (SELECT count(*)::int FROM coin_transactions
          WHERE player_id = ${SELLER} AND source = 'skyblock:generator:' || ${SELLER_ISLAND} || ':tier:2') AS "ledgerRows",
        (SELECT count(*)::int FROM skyblock_mobile_requests
          WHERE player_id = ${SELLER} AND scope = 'skyblock:management:generator-upgrade') AS requests,
        (SELECT progress FROM skyblock_quest_progress
          WHERE player_id = ${SELLER} AND quest_id = 'generator_apprentice') AS "questProgress",
        (SELECT completed_at IS NOT NULL FROM skyblock_quest_progress
          WHERE player_id = ${SELLER} AND quest_id = 'generator_apprentice') AS completed
    `;
    expect(state).toEqual({
      tier: 2,
      radius: 112,
      coins: 750,
      ledgerRows: 1,
      requests: 1,
      questProgress: 2,
      completed: true,
    });
  });

  it("rejects generator upgrades from members without debiting or changing the island", async () => {
    await setupSql`
      UPDATE skyblock_island_members SET role = 'member'
       WHERE island_id = ${SELLER_ISLAND} AND player_id = ${MANAGER}
    `;
    await expect(skyblock.upgradeSkyblockGenerator(
      MANAGER_UID,
      { expectedIslandVersion: 0, expectedNextTier: 2, expectedCostCoins: 250 },
      "82000000-0000-4000-8000-000000000001",
    )).rejects.toMatchObject({ statusCode: 403, data: { code: "ISLAND_ROLE_REQUIRED" } });
    const [state] = await setupSql<{ tier: number; managerCoins: number; requests: number }[]>`
      SELECT
        (SELECT generator_tier FROM skyblock_islands WHERE id = ${SELLER_ISLAND}) AS tier,
        (SELECT coins FROM playerdata WHERE id = ${MANAGER}) AS "managerCoins",
        (SELECT count(*)::int FROM skyblock_mobile_requests
          WHERE player_id = ${MANAGER}) AS requests
    `;
    expect(state).toEqual({ tier: 1, managerCoins: 1000, requests: 0 });
  });

  it("rejects stale, changed, and unaffordable generator offers without any mutation", async () => {
    await expect(skyblock.upgradeSkyblockGenerator(
      SELLER_UID,
      { expectedIslandVersion: 1, expectedNextTier: 2, expectedCostCoins: 250 },
      "8d000000-0000-4000-8000-000000000001",
    )).rejects.toMatchObject({ statusCode: 409, data: { code: "ISLAND_VERSION_CONFLICT" } });
    await expect(skyblock.upgradeSkyblockGenerator(
      SELLER_UID,
      { expectedIslandVersion: 0, expectedNextTier: 3, expectedCostCoins: 750 },
      "8e000000-0000-4000-8000-000000000001",
    )).rejects.toMatchObject({ statusCode: 409, data: { code: "UPGRADE_CHANGED" } });
    await expect(skyblock.upgradeSkyblockGenerator(
      SELLER_UID,
      { expectedIslandVersion: 0, expectedNextTier: 2, expectedCostCoins: 250 },
      "8f000000-0000-4000-8000-000000000001",
    )).rejects.toMatchObject({ statusCode: 409, data: { code: "INSUFFICIENT_COINS" } });
    const [state] = await setupSql<{
      tier: number;
      radius: number;
      version: number;
      coins: number;
      ledgerRows: number;
      requests: number;
      quests: number;
    }[]>`
      SELECT
        (SELECT generator_tier FROM skyblock_islands WHERE id = ${SELLER_ISLAND}) AS tier,
        (SELECT build_radius FROM skyblock_islands WHERE id = ${SELLER_ISLAND}) AS radius,
        (SELECT version::int FROM skyblock_islands WHERE id = ${SELLER_ISLAND}) AS version,
        (SELECT coins FROM playerdata WHERE id = ${SELLER}) AS coins,
        (SELECT count(*)::int FROM coin_transactions WHERE player_id = ${SELLER}) AS "ledgerRows",
        (SELECT count(*)::int FROM skyblock_mobile_requests WHERE player_id = ${SELLER}) AS requests,
        (SELECT count(*)::int FROM skyblock_quest_progress WHERE player_id = ${SELLER}) AS quests
    `;
    expect(state).toEqual({
      tier: 1,
      radius: 96,
      version: 0,
      coins: 100,
      ledgerRows: 0,
      requests: 0,
      quests: 0,
    });
  });

  it("collects workers once while prepared and marked transfers reserve the remaining capacity", async () => {
    await setupSql`UPDATE skyblock_islands SET storage_capacity = 112 WHERE id = ${SELLER_ISLAND}`;
    await setupSql`
      INSERT INTO skyblock_inventory_transfers
        (id, player_id, island_id, inventory_slot, item_id, quantity, state)
      VALUES
        ('8b000000-0000-4000-8000-000000000001', ${SELLER}, ${SELLER_ISLAND}, 1, 'coal', 4, 'prepared'),
        ('8c000000-0000-4000-8000-000000000001', ${MANAGER}, ${SELLER_ISLAND}, 2, 'wheat', 3, 'marked')
    `;
    await setupSql`
      INSERT INTO skyblock_workers
        (id, island_id, worker_type, tier, status, buffer_item_id, buffer_quantity, production_cursor_at)
      VALUES
        ('83000000-0000-4000-8000-000000000001', ${SELLER_ISLAND}, 'farmer', 1,
         'active', 'wheat', 20, now())
    `;
    const key = "84000000-0000-4000-8000-000000000001";
    const results = await Promise.all([
      skyblock.collectSkyblockWorkers(MANAGER_UID, key),
      skyblock.collectSkyblockWorkers(MANAGER_UID, key),
    ]);
    expect(results.map((result) => result.created).sort()).toEqual([false, true]);
    expect(results[0]!.data).toEqual(results[1]!.data);
    expect(results[0]!.data).toMatchObject({
      totalQuantity: 5,
      storage: { usedItems: 105, reservedTransfers: 7, capacity: 112 },
      workers: [expect.objectContaining({ type: "farmer", bufferQuantity: 15 })],
    });
    const [state] = await setupSql<{
      stored: number;
      buffer: number;
      questProgress: number;
      requests: number;
    }[]>`
      SELECT
        (SELECT sum(quantity)::int FROM skyblock_storage_items
          WHERE island_id = ${SELLER_ISLAND}) AS stored,
        (SELECT buffer_quantity::int FROM skyblock_workers
          WHERE island_id = ${SELLER_ISLAND} AND worker_type = 'farmer') AS buffer,
        (SELECT progress FROM skyblock_quest_progress
          WHERE player_id = ${MANAGER} AND quest_id = 'worker_awakened') AS "questProgress",
        (SELECT count(*)::int FROM skyblock_mobile_requests
          WHERE player_id = ${MANAGER} AND scope = 'skyblock:management:workers-collect') AS requests
    `;
    expect(state).toEqual({ stored: 105, buffer: 15, questProgress: 5, requests: 1 });
  });

  it("claims one completed quest once under concurrent retry", async () => {
    await setupSql`
      INSERT INTO skyblock_quest_progress (player_id, quest_id, progress, completed_at)
      VALUES (${SELLER}, 'first_cobble', 16, now())
    `;
    const key = "85000000-0000-4000-8000-000000000001";
    const results = await Promise.all([
      skyblock.claimSkyblockQuest(SELLER_UID, "first_cobble", key),
      skyblock.claimSkyblockQuest(SELLER_UID, "first_cobble", key),
    ]);
    expect(results.map((result) => result.created).sort()).toEqual([false, true]);
    expect(results[0]!.data).toEqual(results[1]!.data);
    expect(results[0]!.data).toMatchObject({ questId: "first_cobble", rewardCoins: 15, coins: 115 });
    const [state] = await setupSql<{
      coins: number;
      claimed: boolean;
      ledgerRows: number;
      requests: number;
    }[]>`
      SELECT
        (SELECT coins FROM playerdata WHERE id = ${SELLER}) AS coins,
        (SELECT claimed_at IS NOT NULL FROM skyblock_quest_progress
          WHERE player_id = ${SELLER} AND quest_id = 'first_cobble') AS claimed,
        (SELECT count(*)::int FROM coin_transactions
          WHERE player_id = ${SELLER} AND source = 'skyblock:quest:first_cobble') AS "ledgerRows",
        (SELECT count(*)::int FROM skyblock_mobile_requests
          WHERE player_id = ${SELLER} AND scope = 'skyblock:management:quests:first_cobble:claim') AS requests
    `;
    expect(state).toEqual({ coins: 115, claimed: true, ledgerRows: 1, requests: 1 });
  });

  it("rejects incomplete and already-claimed quests without coins, ledger, or idempotency rows", async () => {
    await setupSql`
      INSERT INTO skyblock_quest_progress (player_id, quest_id, progress)
      VALUES (${SELLER}, 'first_cobble', 15)
    `;
    await expect(skyblock.claimSkyblockQuest(
      SELLER_UID,
      "first_cobble",
      "90000000-0000-4000-8000-000000000001",
    )).rejects.toMatchObject({ statusCode: 409, data: { code: "QUEST_INCOMPLETE" } });
    await setupSql`
      UPDATE skyblock_quest_progress
         SET progress = 16, completed_at = now(), claimed_at = now()
       WHERE player_id = ${SELLER} AND quest_id = 'first_cobble'
    `;
    await expect(skyblock.claimSkyblockQuest(
      SELLER_UID,
      "first_cobble",
      "91000000-0000-4000-8000-000000000001",
    )).rejects.toMatchObject({ statusCode: 409, data: { code: "QUEST_ALREADY_CLAIMED" } });
    const [state] = await setupSql<{ coins: number; ledgerRows: number; requests: number }[]>`
      SELECT
        (SELECT coins FROM playerdata WHERE id = ${SELLER}) AS coins,
        (SELECT count(*)::int FROM coin_transactions WHERE player_id = ${SELLER}) AS "ledgerRows",
        (SELECT count(*)::int FROM skyblock_mobile_requests WHERE player_id = ${SELLER}) AS requests
    `;
    expect(state).toEqual({ coins: 100, ledgerRows: 0, requests: 0 });
  });

  it("accepts an addressed coop invite once for the authenticated invitee", async () => {
    const inviteId = "86000000-0000-4000-8000-000000000001";
    await setupSql`
      INSERT INTO skyblock_island_invites
        (id, island_id, inviter_player_id, invitee_player_id, status, expires_at)
      VALUES (${inviteId}, ${SELLER_ISLAND}, ${SELLER}, ${INVITEE}, 'pending', now() + interval '1 day')
    `;
    const key = "87000000-0000-4000-8000-000000000001";
    const results = await Promise.all([
      skyblock.acceptSkyblockInvite(INVITEE_UID, inviteId, key),
      skyblock.acceptSkyblockInvite(INVITEE_UID, inviteId, key),
    ]);
    expect(results.map((result) => result.created).sort()).toEqual([false, true]);
    expect(results[0]!.data).toEqual(results[1]!.data);
    expect(results[0]!.data).toMatchObject({
      inviteId,
      island: { islandId: SELLER_ISLAND, name: "Seller Island", role: "member", version: 0 },
      memberCount: 3,
    });
    const [state] = await setupSql<{
      status: string;
      memberships: number;
      skills: number;
      coopProgress: number;
      coopCompleted: boolean;
      requests: number;
    }[]>`
      SELECT
        (SELECT status FROM skyblock_island_invites WHERE id = ${inviteId}) AS status,
        (SELECT count(*)::int FROM skyblock_island_members
          WHERE player_id = ${INVITEE}) AS memberships,
        (SELECT count(*)::int FROM skyblock_skill_progress
          WHERE player_id = ${INVITEE}) AS skills,
        (SELECT progress FROM skyblock_quest_progress
          WHERE player_id = ${SELLER} AND quest_id = 'coop_founder') AS "coopProgress",
        (SELECT completed_at IS NOT NULL FROM skyblock_quest_progress
          WHERE player_id = ${SELLER} AND quest_id = 'coop_founder') AS "coopCompleted",
        (SELECT count(*)::int FROM skyblock_mobile_requests
          WHERE player_id = ${INVITEE} AND scope = 'skyblock:management:invite-accept') AS requests
    `;
    expect(state).toEqual({
      status: "accepted",
      memberships: 1,
      skills: 4,
      coopProgress: 2,
      coopCompleted: true,
      requests: 1,
    });
  });

  it("rejects invite acceptance when the invitee already has a non-active island membership", async () => {
    const disabledIsland = "88000000-0000-4000-8000-000000000001";
    const inviteId = "89000000-0000-4000-8000-000000000001";
    await setupSql`
      INSERT INTO skyblock_islands
        (id, owner_player_id, name, state, grid_x, grid_z, template_version)
      VALUES (${disabledIsland}, ${INVITEE}, 'Disabled Island', 'disabled', 4, 1, 'skyblock-v1')
    `;
    await setupSql`
      INSERT INTO skyblock_island_members (island_id, player_id, role)
      VALUES (${disabledIsland}, ${INVITEE}, 'owner')
    `;
    await setupSql`
      INSERT INTO skyblock_island_invites
        (id, island_id, inviter_player_id, invitee_player_id, status, expires_at)
      VALUES (${inviteId}, ${SELLER_ISLAND}, ${SELLER}, ${INVITEE}, 'pending', now() + interval '1 day')
    `;
    await expect(skyblock.acceptSkyblockInvite(
      INVITEE_UID,
      inviteId,
      "8a000000-0000-4000-8000-000000000001",
    )).rejects.toMatchObject({ statusCode: 409, data: { code: "ALREADY_IN_ISLAND" } });
    const [state] = await setupSql<{ status: string; memberships: number; requests: number }[]>`
      SELECT
        (SELECT status FROM skyblock_island_invites WHERE id = ${inviteId}) AS status,
        (SELECT count(*)::int FROM skyblock_island_members WHERE player_id = ${INVITEE}) AS memberships,
        (SELECT count(*)::int FROM skyblock_mobile_requests WHERE player_id = ${INVITEE}) AS requests
    `;
    expect(state).toEqual({ status: "pending", memberships: 1, requests: 0 });
  });

  it("rejects expired and full-coop invitations without changing membership or invite state", async () => {
    const expiredInvite = "92000000-0000-4000-8000-000000000001";
    await setupSql`
      INSERT INTO skyblock_island_invites
        (id, island_id, inviter_player_id, invitee_player_id, status, expires_at)
      VALUES (${expiredInvite}, ${SELLER_ISLAND}, ${SELLER}, ${INVITEE}, 'pending', now() - interval '1 minute')
    `;
    await expect(skyblock.acceptSkyblockInvite(
      INVITEE_UID,
      expiredInvite,
      "93000000-0000-4000-8000-000000000001",
    )).rejects.toMatchObject({ statusCode: 409, data: { code: "INVITE_EXPIRED" } });

    await setupSql`UPDATE skyblock_island_invites SET status = 'expired', resolved_at = now() WHERE id = ${expiredInvite}`;
    await setupSql`UPDATE skyblock_islands SET member_limit = 2 WHERE id = ${SELLER_ISLAND}`;
    const fullInvite = "94000000-0000-4000-8000-000000000001";
    await setupSql`
      INSERT INTO skyblock_island_invites
        (id, island_id, inviter_player_id, invitee_player_id, status, expires_at)
      VALUES (${fullInvite}, ${SELLER_ISLAND}, ${SELLER}, ${INVITEE}, 'pending', now() + interval '1 day')
    `;
    await expect(skyblock.acceptSkyblockInvite(
      INVITEE_UID,
      fullInvite,
      "95000000-0000-4000-8000-000000000001",
    )).rejects.toMatchObject({ statusCode: 409, data: { code: "COOP_FULL" } });
    const [state] = await setupSql<{
      expiredStatus: string;
      fullStatus: string;
      memberships: number;
      requests: number;
    }[]>`
      SELECT
        (SELECT status FROM skyblock_island_invites WHERE id = ${expiredInvite}) AS "expiredStatus",
        (SELECT status FROM skyblock_island_invites WHERE id = ${fullInvite}) AS "fullStatus",
        (SELECT count(*)::int FROM skyblock_island_members WHERE player_id = ${INVITEE}) AS memberships,
        (SELECT count(*)::int FROM skyblock_mobile_requests WHERE player_id = ${INVITEE}) AS requests
    `;
    expect(state).toEqual({
      expiredStatus: "expired",
      fullStatus: "pending",
      memberships: 0,
      requests: 0,
    });
  });

  it("serializes invite acceptance behind a concurrent membership elsewhere", async () => {
    const inviteId = "96000000-0000-4000-8000-000000000001";
    const otherIsland = "97000000-0000-4000-8000-000000000001";
    await setupSql`
      INSERT INTO skyblock_island_invites
        (id, island_id, inviter_player_id, invitee_player_id, status, expires_at)
      VALUES (${inviteId}, ${SELLER_ISLAND}, ${SELLER}, ${INVITEE}, 'pending', now() + interval '1 day')
    `;
    let lockedResolve!: () => void;
    const locked = new Promise<void>((resolve) => { lockedResolve = resolve; });
    let releaseResolve!: () => void;
    const release = new Promise<void>((resolve) => { releaseResolve = resolve; });
    const membershipElsewhere = setupSql.begin(async (tx) => {
      await tx`SELECT id FROM playerdata WHERE id = ${INVITEE} FOR UPDATE`;
      lockedResolve();
      await release;
      await tx`
        INSERT INTO skyblock_islands
          (id, owner_player_id, name, state, grid_x, grid_z, template_version)
        VALUES (${otherIsland}, ${INVITEE}, 'Other Island', 'active', 5, 1, 'skyblock-v1')
      `;
      await tx`
        INSERT INTO skyblock_island_members (island_id, player_id, role)
        VALUES (${otherIsland}, ${INVITEE}, 'owner')
      `;
    });
    await locked;
    const acceptance = skyblock.acceptSkyblockInvite(
      INVITEE_UID,
      inviteId,
      "98000000-0000-4000-8000-000000000001",
    );
    releaseResolve();
    await membershipElsewhere;
    await expect(acceptance).rejects.toMatchObject({
      statusCode: 409,
      data: { code: "ALREADY_IN_ISLAND" },
    });
    const [state] = await setupSql<{
      inviteStatus: string;
      islandId: string;
      memberships: number;
      requests: number;
    }[]>`
      SELECT
        (SELECT status FROM skyblock_island_invites WHERE id = ${inviteId}) AS "inviteStatus",
        (SELECT island_id FROM skyblock_island_members WHERE player_id = ${INVITEE}) AS "islandId",
        (SELECT count(*)::int FROM skyblock_island_members WHERE player_id = ${INVITEE}) AS memberships,
        (SELECT count(*)::int FROM skyblock_mobile_requests WHERE player_id = ${INVITEE}) AS requests
    `;
    expect(state).toEqual({ inviteStatus: "pending", islandId: otherIsland, memberships: 1, requests: 0 });
  });
});
