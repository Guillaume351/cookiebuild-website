import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const IDS = {
  inventory: "10000000-0000-4000-8000-000000000001",
  quote: "20000000-0000-4000-8000-000000000001",
  listing: "30000000-0000-4000-8000-000000000001",
  idempotency: "40000000-0000-4000-8000-000000000001",
  invite: "50000000-0000-4000-8000-000000000001",
};

const h3Mocks = vi.hoisted(() => ({
  getHeader: vi.fn((): string | undefined => IDS.idempotency),
  getQuery: vi.fn(() => ({})),
  getRouterParam: vi.fn((): string | undefined => IDS.listing),
  readBody: vi.fn(async (): Promise<unknown> => ({})),
  setResponseStatus: vi.fn(),
}));
const capabilityMocks = vi.hoisted(() => ({
  mobileCapabilities: vi.fn(async () => ({
    skyblockManagementWrites: true,
    skyblockMarketWrites: true,
  })),
  requireMobileCapability: vi.fn(async () => undefined),
}));
const serviceMocks = vi.hoisted(() => ({
  skyblockOverview: vi.fn(async () => ({ schemaVersion: 1 })),
  skyblockInventory: vi.fn(async () => ({ items: [] })),
  skyblockMarket: vi.fn(async () => ({ items: [] })),
  skyblockListings: vi.fn(async () => ({ items: [] })),
  skyblockMerchant: vi.fn(async () => ({ wallet: { balanceCoins: 100 } })),
  sellToSkyblockMerchant: vi.fn(async () => ({
    data: { totalCoins: 16 },
    created: true,
  })),
  buyFromSkyblockMerchant: vi.fn(async () => ({
    data: { totalCoins: 12 },
    created: true,
  })),
  createSkyblockListingQuote: vi.fn(async () => ({ quoteId: IDS.quote })),
  createSkyblockListing: vi.fn(async () => ({
    data: { listingId: IDS.listing },
    created: true,
  })),
  cancelSkyblockListing: vi.fn(async () => ({
    data: { listingId: IDS.listing, status: "cancelled" },
    created: true,
  })),
  purchaseSkyblockListing: vi.fn(async () => ({
    data: { purchaseId: IDS.quote },
    created: true,
  })),
  skyblockManagementOverview: vi.fn(async () => ({
    policyVersion: "skyblock-management-v1",
  })),
  upgradeSkyblockGenerator: vi.fn(async () => ({
    data: { costCoins: 500 },
    created: true,
  })),
  collectSkyblockWorkers: vi.fn(async () => ({
    data: { totalQuantity: 32 },
    created: true,
  })),
  upgradeSkyblockWorker: vi.fn(async () => ({
    data: { costCoins: 750 },
    created: true,
  })),
  skyblockPeriodicObjectives: vi.fn(async () => ({
    schemaVersion: 2,
    objectives: [],
  })),
  claimSkyblockPeriodicObjective: vi.fn(async () => ({
    data: { rewardCoins: 75 },
    created: true,
  })),
  claimSkyblockQuest: vi.fn(async () => ({
    data: { questId: "first_cobble" },
    created: true,
  })),
  acceptSkyblockInvite: vi.fn(async () => ({
    data: { inviteId: IDS.invite },
    created: true,
  })),
}));
const userMocks = vi.hoisted(() => ({
  requireMobileUser: vi.fn(async () => ({
    auth: { uid: "firebase-skyblock-user" },
  })),
}));

vi.mock("h3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("h3")>()),
  ...h3Mocks,
}));
vi.mock("../server/services/mobile-capabilities", () => capabilityMocks);
vi.mock("../server/services/mobile-skyblock", () => serviceMocks);
vi.mock("../server/services/mobile-user", () => userMocks);
vi.mock("../server/utils/mobile-rate-limit", () => ({
  enforceMobileRequestRateLimit: vi.fn(),
}));

describe("mobile Skyblock API routes", () => {
  let overviewRoute: (event: unknown) => Promise<unknown>;
  let quoteRoute: (event: unknown) => Promise<unknown>;
  let createRoute: (event: unknown) => Promise<unknown>;
  let cancelRoute: (event: unknown) => Promise<unknown>;
  let purchaseRoute: (event: unknown) => Promise<unknown>;
  let managementRoute: (event: unknown) => Promise<unknown>;
  let merchantRoute: (event: unknown) => Promise<unknown>;
  let merchantSellRoute: (event: unknown) => Promise<unknown>;
  let merchantBuyRoute: (event: unknown) => Promise<unknown>;
  let generatorRoute: (event: unknown) => Promise<unknown>;
  let collectRoute: (event: unknown) => Promise<unknown>;
  let workerUpgradeRoute: (event: unknown) => Promise<unknown>;
  let objectivesRoute: (event: unknown) => Promise<unknown>;
  let objectiveClaimRoute: (event: unknown) => Promise<unknown>;
  let claimRoute: (event: unknown) => Promise<unknown>;
  let acceptInviteRoute: (event: unknown) => Promise<unknown>;

  beforeAll(async () => {
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("setHeader", vi.fn());
    overviewRoute = (await import("../server/api/mobile/v1/skyblock.get"))
      .default as typeof overviewRoute;
    quoteRoute = (
      await import("../server/api/mobile/v1/skyblock/listing-quotes.post")
    ).default as typeof quoteRoute;
    createRoute = (
      await import("../server/api/mobile/v1/skyblock/listings.post")
    ).default as typeof createRoute;
    cancelRoute = (
      await import("../server/api/mobile/v1/skyblock/listings/[id]/cancel.post")
    ).default as typeof cancelRoute;
    purchaseRoute = (
      await import("../server/api/mobile/v1/skyblock/listings/[id]/purchase.post")
    ).default as typeof purchaseRoute;
    managementRoute = (
      await import("../server/api/mobile/v1/skyblock/management.get")
    ).default as typeof managementRoute;
    merchantRoute = (
      await import("../server/api/mobile/v1/skyblock/merchant.get")
    ).default as typeof merchantRoute;
    merchantSellRoute = (
      await import("../server/api/mobile/v1/skyblock/merchant/[id]/sell.post")
    ).default as typeof merchantSellRoute;
    merchantBuyRoute = (
      await import("../server/api/mobile/v1/skyblock/merchant/[id]/buy.post")
    ).default as typeof merchantBuyRoute;
    generatorRoute = (
      await import("../server/api/mobile/v1/skyblock/upgrades/generator.post")
    ).default as typeof generatorRoute;
    collectRoute = (
      await import("../server/api/mobile/v1/skyblock/workers/collect.post")
    ).default as typeof collectRoute;
    workerUpgradeRoute = (
      await import("../server/api/mobile/v1/skyblock/workers/[id]/upgrade.post")
    ).default as typeof workerUpgradeRoute;
    objectivesRoute = (
      await import("../server/api/mobile/v1/skyblock/objectives.get")
    ).default as typeof objectivesRoute;
    objectiveClaimRoute = (
      await import("../server/api/mobile/v1/skyblock/objectives/[cadence]/claim.post")
    ).default as typeof objectiveClaimRoute;
    claimRoute = (
      await import("../server/api/mobile/v1/skyblock/quests/[id]/claim.post")
    ).default as typeof claimRoute;
    acceptInviteRoute = (
      await import("../server/api/mobile/v1/skyblock/coop/invites/[id]/accept.post")
    ).default as typeof acceptInviteRoute;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    capabilityMocks.requireMobileCapability.mockResolvedValue(undefined);
    userMocks.requireMobileUser.mockResolvedValue({
      auth: { uid: "firebase-skyblock-user" },
    });
    h3Mocks.getHeader.mockReturnValue(IDS.idempotency);
    h3Mocks.getRouterParam.mockReturnValue(IDS.listing);
    h3Mocks.readBody.mockResolvedValue({});
    capabilityMocks.mobileCapabilities.mockResolvedValue({
      skyblockManagementWrites: true,
      skyblockMarketWrites: true,
    });
    serviceMocks.createSkyblockListing.mockResolvedValue({
      data: { listingId: IDS.listing },
      created: true,
    });
    serviceMocks.purchaseSkyblockListing.mockResolvedValue({
      data: { purchaseId: IDS.quote },
      created: true,
    });
  });

  afterAll(() => vi.unstubAllGlobals());

  it("gates overview reads and includes the independent market-write state", async () => {
    await overviewRoute({ context: {} });
    expect(capabilityMocks.requireMobileCapability).toHaveBeenCalledWith(
      "skyblockCompanion",
    );
    expect(serviceMocks.skyblockOverview).toHaveBeenCalledWith(
      "firebase-skyblock-user",
      true,
    );
  });

  it("creates a bounded server quote without accepting identity or item metadata", async () => {
    h3Mocks.readBody.mockResolvedValue({
      inventoryItemId: IDS.inventory,
      quantity: 16,
      priceCoins: 100,
    });
    await quoteRoute({ context: {} });
    expect(capabilityMocks.requireMobileCapability).toHaveBeenCalledWith(
      "skyblockMarketWrites",
    );
    expect(serviceMocks.createSkyblockListingQuote).toHaveBeenCalledWith(
      "firebase-skyblock-user",
      {
        inventoryItemId: IDS.inventory,
        quantity: 16,
        priceCoins: 100,
      },
    );
    expect(h3Mocks.setResponseStatus).toHaveBeenCalledWith(
      expect.anything(),
      201,
    );
  });

  it("passes one UUID idempotency key through listing creation and reports retries", async () => {
    h3Mocks.readBody.mockResolvedValue({ quoteId: IDS.quote });
    const event = { context: {} };
    await createRoute(event);
    expect(serviceMocks.createSkyblockListing).toHaveBeenCalledWith(
      "firebase-skyblock-user",
      { quoteId: IDS.quote },
      IDS.idempotency,
    );
    expect(h3Mocks.setResponseStatus).toHaveBeenLastCalledWith(event, 201);

    serviceMocks.createSkyblockListing.mockResolvedValueOnce({
      data: { listingId: IDS.listing },
      created: false,
    });
    await createRoute(event);
    expect(h3Mocks.setResponseStatus).toHaveBeenLastCalledWith(event, 200);
  });

  it("rejects a missing idempotency key before any listing mutation", async () => {
    h3Mocks.readBody.mockResolvedValue({ quoteId: IDS.quote });
    h3Mocks.getHeader.mockReturnValue(undefined);
    await expect(createRoute({ context: {} })).rejects.toMatchObject({
      statusCode: 428,
      data: { code: "IDEMPOTENCY_KEY_REQUIRED" },
    });
    expect(serviceMocks.createSkyblockListing).not.toHaveBeenCalled();
  });

  it("allows only an empty cancellation body", async () => {
    h3Mocks.readBody.mockResolvedValue({});
    await cancelRoute({ context: {} });
    expect(serviceMocks.cancelSkyblockListing).toHaveBeenCalledWith(
      "firebase-skyblock-user",
      IDS.listing,
      IDS.idempotency,
    );

    h3Mocks.readBody.mockResolvedValue({ reason: "free text" });
    await expect(cancelRoute({ context: {} })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("requires an expected total price and returns 201 then 200 on replay", async () => {
    h3Mocks.readBody.mockResolvedValue({ expectedPriceCoins: 500 });
    const event = { context: {} };
    await purchaseRoute(event);
    expect(serviceMocks.purchaseSkyblockListing).toHaveBeenCalledWith(
      "firebase-skyblock-user",
      IDS.listing,
      { expectedPriceCoins: 500 },
      IDS.idempotency,
    );
    expect(h3Mocks.setResponseStatus).toHaveBeenLastCalledWith(event, 201);

    serviceMocks.purchaseSkyblockListing.mockResolvedValueOnce({
      data: { purchaseId: IDS.quote },
      created: false,
    });
    await purchaseRoute(event);
    expect(h3Mocks.setResponseStatus).toHaveBeenLastCalledWith(event, 200);
  });

  it("returns one authenticated management aggregate with the independent write state", async () => {
    await managementRoute({ context: {} });
    expect(capabilityMocks.requireMobileCapability).toHaveBeenCalledWith(
      "skyblockCompanion",
    );
    expect(serviceMocks.skyblockManagementOverview).toHaveBeenCalledWith(
      "firebase-skyblock-user",
      true,
    );
  });

  it("reads and trades with the Skyblock Merchant through strict contracts", async () => {
    await merchantRoute({ context: {} });
    expect(capabilityMocks.requireMobileCapability).toHaveBeenLastCalledWith(
      "skyblockCompanion",
    );
    expect(serviceMocks.skyblockMerchant).toHaveBeenCalledWith(
      "firebase-skyblock-user",
    );

    h3Mocks.getRouterParam.mockReturnValue("coal");
    h3Mocks.readBody.mockResolvedValue({
      inventoryItemId: IDS.inventory,
      expectedStorageVersion: 3,
      quantity: 8,
      expectedUnitPrice: 2,
    });
    await merchantSellRoute({ context: {} });
    expect(serviceMocks.sellToSkyblockMerchant).toHaveBeenCalledWith(
      "firebase-skyblock-user",
      "coal",
      {
        inventoryItemId: IDS.inventory,
        expectedStorageVersion: 3,
        quantity: 8,
        expectedUnitPrice: 2,
      },
      IDS.idempotency,
    );

    h3Mocks.readBody.mockResolvedValue({ quantity: 2, expectedUnitPrice: 6 });
    await merchantBuyRoute({ context: {} });
    expect(serviceMocks.buyFromSkyblockMerchant).toHaveBeenCalledWith(
      "firebase-skyblock-user",
      "coal",
      { quantity: 2, expectedUnitPrice: 6 },
      IDS.idempotency,
    );
    expect(capabilityMocks.requireMobileCapability).toHaveBeenLastCalledWith(
      "skyblockManagementWrites",
    );
  });

  it("validates and forwards a server-authoritative generator upgrade", async () => {
    h3Mocks.readBody.mockResolvedValue({
      expectedIslandVersion: 4,
      expectedNextTier: 2,
      expectedCostCoins: 500,
    });
    await generatorRoute({ context: {} });
    expect(capabilityMocks.requireMobileCapability).toHaveBeenCalledWith(
      "skyblockManagementWrites",
    );
    expect(serviceMocks.upgradeSkyblockGenerator).toHaveBeenCalledWith(
      "firebase-skyblock-user",
      { expectedIslandVersion: 4, expectedNextTier: 2, expectedCostCoins: 500 },
      IDS.idempotency,
    );
  });

  it("keeps worker collection body empty and idempotent", async () => {
    h3Mocks.readBody.mockResolvedValue({});
    await collectRoute({ context: {} });
    expect(serviceMocks.collectSkyblockWorkers).toHaveBeenCalledWith(
      "firebase-skyblock-user",
      IDS.idempotency,
    );
    h3Mocks.readBody.mockResolvedValue({ workerId: IDS.inventory });
    await expect(collectRoute({ context: {} })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("upgrades one worker only with exact tier and cost stale guards", async () => {
    h3Mocks.getRouterParam.mockReturnValue(IDS.inventory);
    h3Mocks.readBody.mockResolvedValue({
      expectedTier: 2,
      expectedNextTier: 3,
      expectedCostCoins: 750,
    });
    await workerUpgradeRoute({ context: {} });
    expect(serviceMocks.upgradeSkyblockWorker).toHaveBeenCalledWith(
      "firebase-skyblock-user",
      IDS.inventory,
      { expectedTier: 2, expectedNextTier: 3, expectedCostCoins: 750 },
      IDS.idempotency,
    );
    h3Mocks.readBody.mockResolvedValue({
      expectedTier: 2,
      expectedNextTier: 4,
      expectedCostCoins: 1_800,
    });
    await expect(workerUpgradeRoute({ context: {} })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("reads current objectives and claims one exact cadence-period-id tuple", async () => {
    await objectivesRoute({ context: {} });
    expect(serviceMocks.skyblockPeriodicObjectives).toHaveBeenCalledWith(
      "firebase-skyblock-user",
      true,
    );
    h3Mocks.getRouterParam.mockReturnValue("daily");
    h3Mocks.readBody.mockResolvedValue({
      periodStart: "2026-08-24",
      objectiveId: "daily_cobble",
    });
    await objectiveClaimRoute({ context: {} });
    expect(serviceMocks.claimSkyblockPeriodicObjective).toHaveBeenCalledWith(
      "firebase-skyblock-user",
      "daily",
      { periodStart: "2026-08-24", objectiveId: "daily_cobble" },
      IDS.idempotency,
    );
  });

  it("claims only a validated catalog-shaped quest id", async () => {
    h3Mocks.getRouterParam.mockReturnValue("first_cobble");
    h3Mocks.readBody.mockResolvedValue({});
    await claimRoute({ context: {} });
    expect(serviceMocks.claimSkyblockQuest).toHaveBeenCalledWith(
      "firebase-skyblock-user",
      "first_cobble",
      IDS.idempotency,
    );
  });

  it("accepts a coop invite by invite id without accepting a player identity", async () => {
    h3Mocks.getRouterParam.mockReturnValue(IDS.invite);
    h3Mocks.readBody.mockResolvedValue({});
    await acceptInviteRoute({ context: {} });
    expect(serviceMocks.acceptSkyblockInvite).toHaveBeenCalledWith(
      "firebase-skyblock-user",
      IDS.invite,
      IDS.idempotency,
    );
  });

  it("checks each read/write feature flag before authentication and each service after authentication", async () => {
    const routes = [
      { route: managementRoute, capability: "skyblockCompanion" },
      { route: generatorRoute, capability: "skyblockManagementWrites" },
      { route: collectRoute, capability: "skyblockManagementWrites" },
      { route: claimRoute, capability: "skyblockManagementWrites" },
      { route: acceptInviteRoute, capability: "skyblockManagementWrites" },
    ] as const;
    for (const { route, capability } of routes) {
      vi.clearAllMocks();
      capabilityMocks.requireMobileCapability.mockRejectedValueOnce(
        Object.assign(new Error("Feature unavailable"), { statusCode: 404 }),
      );
      await expect(route({ context: {} })).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(capabilityMocks.requireMobileCapability).toHaveBeenCalledWith(
        capability,
      );
      expect(userMocks.requireMobileUser).not.toHaveBeenCalled();
    }

    for (const { route } of routes) {
      vi.clearAllMocks();
      capabilityMocks.requireMobileCapability.mockResolvedValue(undefined);
      userMocks.requireMobileUser.mockRejectedValueOnce(
        Object.assign(new Error("Authentication required"), {
          statusCode: 401,
        }),
      );
      await expect(route({ context: {} })).rejects.toMatchObject({
        statusCode: 401,
      });
      expect(serviceMocks.skyblockManagementOverview).not.toHaveBeenCalled();
      expect(serviceMocks.upgradeSkyblockGenerator).not.toHaveBeenCalled();
      expect(serviceMocks.collectSkyblockWorkers).not.toHaveBeenCalled();
      expect(serviceMocks.claimSkyblockQuest).not.toHaveBeenCalled();
      expect(serviceMocks.acceptSkyblockInvite).not.toHaveBeenCalled();
    }
  });
});
