import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const IDS = {
  inventory: "10000000-0000-4000-8000-000000000001",
  quote: "20000000-0000-4000-8000-000000000001",
  listing: "30000000-0000-4000-8000-000000000001",
  idempotency: "40000000-0000-4000-8000-000000000001",
};

const h3Mocks = vi.hoisted(() => ({
  getHeader: vi.fn((): string | undefined => IDS.idempotency),
  getQuery: vi.fn(() => ({})),
  getRouterParam: vi.fn((): string | undefined => IDS.listing),
  readBody: vi.fn(async (): Promise<unknown> => ({})),
  setResponseStatus: vi.fn(),
}));
const capabilityMocks = vi.hoisted(() => ({
  mobileCapabilities: vi.fn(async () => ({ skyblockMarketWrites: true })),
  requireMobileCapability: vi.fn(async () => undefined),
}));
const serviceMocks = vi.hoisted(() => ({
  skyblockOverview: vi.fn(async () => ({ schemaVersion: 1 })),
  skyblockInventory: vi.fn(async () => ({ items: [] })),
  skyblockMarket: vi.fn(async () => ({ items: [] })),
  skyblockListings: vi.fn(async () => ({ items: [] })),
  createSkyblockListingQuote: vi.fn(async () => ({ quoteId: IDS.quote })),
  createSkyblockListing: vi.fn(async () => ({ data: { listingId: IDS.listing }, created: true })),
  cancelSkyblockListing: vi.fn(async () => ({ data: { listingId: IDS.listing, status: "cancelled" }, created: true })),
  purchaseSkyblockListing: vi.fn(async () => ({ data: { purchaseId: IDS.quote }, created: true })),
}));
const userMocks = vi.hoisted(() => ({
  requireMobileUser: vi.fn(async () => ({ auth: { uid: "firebase-skyblock-user" } })),
}));

vi.mock("h3", async (importOriginal) => ({
  ...await importOriginal<typeof import("h3")>(),
  ...h3Mocks,
}));
vi.mock("../server/services/mobile-capabilities", () => capabilityMocks);
vi.mock("../server/services/mobile-skyblock", () => serviceMocks);
vi.mock("../server/services/mobile-user", () => userMocks);
vi.mock("../server/utils/mobile-rate-limit", () => ({ enforceMobileRequestRateLimit: vi.fn() }));

describe("mobile Skyblock API routes", () => {
  let overviewRoute: (event: unknown) => Promise<unknown>;
  let quoteRoute: (event: unknown) => Promise<unknown>;
  let createRoute: (event: unknown) => Promise<unknown>;
  let cancelRoute: (event: unknown) => Promise<unknown>;
  let purchaseRoute: (event: unknown) => Promise<unknown>;

  beforeAll(async () => {
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("setHeader", vi.fn());
    overviewRoute = (await import("../server/api/mobile/v1/skyblock.get")).default as typeof overviewRoute;
    quoteRoute = (await import("../server/api/mobile/v1/skyblock/listing-quotes.post")).default as typeof quoteRoute;
    createRoute = (await import("../server/api/mobile/v1/skyblock/listings.post")).default as typeof createRoute;
    cancelRoute = (await import("../server/api/mobile/v1/skyblock/listings/[id]/cancel.post")).default as typeof cancelRoute;
    purchaseRoute = (await import("../server/api/mobile/v1/skyblock/listings/[id]/purchase.post")).default as typeof purchaseRoute;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    h3Mocks.getHeader.mockReturnValue(IDS.idempotency);
    h3Mocks.getRouterParam.mockReturnValue(IDS.listing);
    h3Mocks.readBody.mockResolvedValue({});
    capabilityMocks.mobileCapabilities.mockResolvedValue({ skyblockMarketWrites: true });
    serviceMocks.createSkyblockListing.mockResolvedValue({ data: { listingId: IDS.listing }, created: true });
    serviceMocks.purchaseSkyblockListing.mockResolvedValue({ data: { purchaseId: IDS.quote }, created: true });
  });

  afterAll(() => vi.unstubAllGlobals());

  it("gates overview reads and includes the independent market-write state", async () => {
    await overviewRoute({ context: {} });
    expect(capabilityMocks.requireMobileCapability).toHaveBeenCalledWith("skyblockCompanion");
    expect(serviceMocks.skyblockOverview).toHaveBeenCalledWith("firebase-skyblock-user", true);
  });

  it("creates a bounded server quote without accepting identity or item metadata", async () => {
    h3Mocks.readBody.mockResolvedValue({
      inventoryItemId: IDS.inventory,
      quantity: 16,
      priceCoins: 100,
    });
    await quoteRoute({ context: {} });
    expect(capabilityMocks.requireMobileCapability).toHaveBeenCalledWith("skyblockMarketWrites");
    expect(serviceMocks.createSkyblockListingQuote).toHaveBeenCalledWith("firebase-skyblock-user", {
      inventoryItemId: IDS.inventory,
      quantity: 16,
      priceCoins: 100,
    });
    expect(h3Mocks.setResponseStatus).toHaveBeenCalledWith(expect.anything(), 201);
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
    await expect(cancelRoute({ context: {} })).rejects.toMatchObject({ statusCode: 400 });
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
});
