import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

describe("mobile social API gates", () => {
  let databaseModule: typeof import("../db/client");

  beforeAll(async () => {
    process.env.NUXT_DATABASE_URL = "postgres://unused:unused@127.0.0.1:1/unused";
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("defineCachedEventHandler", (handler: unknown) => handler);
    databaseModule = await import("../db/client");
  });

  afterAll(async () => {
    delete process.env.MOBILE_FRIENDS_ENABLED;
    delete process.env.MOBILE_PARTIES_ENABLED;
    await databaseModule.postgresClient.end({ timeout: 0 });
    vi.unstubAllGlobals();
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

  it("keeps unfinished games fail-closed in bootstrap metadata", async () => {
    delete process.env.MOBILE_FRIENDS_ENABLED;
    delete process.env.MOBILE_PARTIES_ENABLED;
    const handler = (await import("../server/api/mobile/v1/bootstrap.get")).default as unknown as (
      event: unknown,
    ) => Promise<{
      data: {
        features: { friends: boolean; parties: boolean };
        gamemodes: Array<{ id: string; available: boolean }>;
      };
    }>;
    const response = await handler({});
    expect(response.data.features).toMatchObject({ friends: false, parties: false });
    expect(response.data.gamemodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "microbattles", available: true }),
      expect.objectContaining({ id: "pitchout", available: true }),
      expect.objectContaining({ id: "skywars", available: true }),
      expect.objectContaining({ id: "buildbattles", available: true }),
      expect.objectContaining({ id: "turfwars", available: true }),
      expect.objectContaining({ id: "bedwars", available: false }),
    ]));
  });
});
