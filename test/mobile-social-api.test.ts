import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

describe("mobile social API gates", () => {
  let databaseModule: typeof import("../db/client");
  let capabilityModule: typeof import("../server/services/mobile-capabilities");

  beforeAll(async () => {
    process.env.NUXT_DATABASE_URL = "postgres://unused:unused@127.0.0.1:1/unused";
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("defineCachedEventHandler", (handler: unknown) => handler);
    databaseModule = await import("../db/client");
    capabilityModule = await import("../server/services/mobile-capabilities");
  });

  afterAll(async () => {
    delete process.env.MOBILE_FRIENDS_ENABLED;
    delete process.env.MOBILE_PARTIES_ENABLED;
    delete process.env.COOKIEBUILD_BEDWARS_ENABLED;
    delete process.env.MOBILE_KIT_SHOP_ENABLED;
    delete process.env.MOBILE_PLAYER_DASHBOARD_ENABLED;
    delete process.env.MOBILE_SKYBLOCK_ENABLED;
    delete process.env.MOBILE_SKYBLOCK_MARKET_WRITES_ENABLED;
    await databaseModule.postgresClient.end({ timeout: 0 });
    vi.unstubAllGlobals();
  });

  it("keeps private shop and dashboard capabilities disabled unless explicitly enabled", () => {
    delete process.env.MOBILE_KIT_SHOP_ENABLED;
    delete process.env.MOBILE_PLAYER_DASHBOARD_ENABLED;
    expect(capabilityModule.configuredMobileCapabilities()).toEqual({
      kitShop: false,
      playerDashboard: false,
      skyblockCompanion: false,
      skyblockMarketWrites: false,
    });

    process.env.MOBILE_KIT_SHOP_ENABLED = "TRUE";
    process.env.MOBILE_PLAYER_DASHBOARD_ENABLED = "true";
    expect(capabilityModule.configuredMobileCapabilities()).toEqual({
      kitShop: true,
      playerDashboard: true,
      skyblockCompanion: false,
      skyblockMarketWrites: false,
    });
  });

  it("rejects shop and dashboard routes before authentication while flags are disabled", async () => {
    delete process.env.MOBILE_KIT_SHOP_ENABLED;
    delete process.env.MOBILE_PLAYER_DASHBOARD_ENABLED;
    capabilityModule.resetMobileCapabilityCacheForTests();
    const kitHandler = (await import("../server/api/mobile/v1/kits.get")).default as (
      event: unknown,
    ) => Promise<unknown>;
    const dashboardHandler = (await import("../server/api/mobile/v1/me/dashboard.get")).default as (
      event: unknown,
    ) => Promise<unknown>;

    await expect(kitHandler({ context: {} })).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: "Feature unavailable",
    });
    await expect(dashboardHandler({ context: {} })).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: "Feature unavailable",
    });
  });

  it("returns feature-unavailable before authentication when friends are disabled", async () => {
    delete process.env.MOBILE_FRIENDS_ENABLED;
    const handler = (await import("../server/api/mobile/v1/friends.get")).default as (
      event: unknown,
    ) => Promise<unknown>;
    await expect(handler({ context: {} })).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: "Feature unavailable",
    });
  });

  it("requires Firebase authentication after the explicit feature gate is enabled", async () => {
    process.env.MOBILE_FRIENDS_ENABLED = "true";
    const handler = (await import("../server/api/mobile/v1/friends.get")).default as (
      event: unknown,
    ) => Promise<unknown>;
    await expect(handler({ context: {} })).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: "Authentication required",
    });
  });

  it("keeps the BedWars beta fail-closed when its release flag is absent", async () => {
    delete process.env.MOBILE_FRIENDS_ENABLED;
    delete process.env.MOBILE_PARTIES_ENABLED;
    delete process.env.COOKIEBUILD_BEDWARS_ENABLED;
    const handler = (await import("../server/api/mobile/v1/bootstrap.get")).default as unknown as (
      event: unknown,
    ) => Promise<{
      data: {
        features: {
          friends: boolean;
          parties: boolean;
          presence: boolean;
          friendOnlineAlerts: boolean;
          shop: boolean;
          playerDashboard: boolean;
          skyblockCompanion: boolean;
          skyblockMarketWrites: boolean;
        };
        gamemodes: Array<{ id: string; available: boolean; releaseStage?: string }>;
      };
    }>;
    const response = await handler({});
    expect(response.data.features).toMatchObject({
      friends: false,
      parties: false,
      presence: false,
      friendOnlineAlerts: false,
      shop: false,
      playerDashboard: false,
      skyblockCompanion: false,
      skyblockMarketWrites: false,
    });
    expect(response.data.gamemodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "microbattles", available: true }),
      expect.objectContaining({ id: "pitchout", available: true }),
      expect.objectContaining({ id: "skywars", available: true }),
      expect.objectContaining({ id: "buildbattles", available: true }),
      expect.objectContaining({ id: "turfwars", available: true }),
      expect.objectContaining({ id: "bedwars", available: false, releaseStage: "beta" }),
      expect.objectContaining({ id: "skyblock", available: false, releaseStage: "beta" }),
    ]));
  });

  it("marks the BedWars beta available only when its strict release flag is true", async () => {
    process.env.COOKIEBUILD_BEDWARS_ENABLED = "true";
    const handler = (await import("../server/api/mobile/v1/bootstrap.get")).default as unknown as (
      event: unknown,
    ) => Promise<{
      data: { gamemodes: Array<{ id: string; available: boolean; releaseStage?: string }> };
    }>;

    const response = await handler({});

    expect(response.data.gamemodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "bedwars", available: true, releaseStage: "beta" }),
    ]));
  });
});
