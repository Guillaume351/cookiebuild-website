import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h3Mocks = vi.hoisted(() => ({
  getRouterParam: vi.fn(() => "20000000-0000-4000-8000-000000000001"),
  readBody: vi.fn(async (): Promise<unknown> => ({ response: "joining" })),
  setHeader: vi.fn(),
  setResponseStatus: vi.fn(),
}));
const serviceMocks = vi.hoisted(() => ({
  getPlayerRally: vi.fn(),
  respondToPlayerRally: vi.fn(),
}));
const userMocks = vi.hoisted(() => ({
  requireMobileUser: vi.fn(async () => ({ auth: { uid: "firebase-user" } })),
}));

vi.mock("h3", async (importOriginal) => ({
  ...await importOriginal<typeof import("h3")>(),
  ...h3Mocks,
}));
vi.mock("../server/services/mobile-rallies", () => serviceMocks);
vi.mock("../server/services/mobile-user", () => userMocks);

interface RouteResult {
  data: {
    id: string;
    source: string;
    gamemode: string;
    targetPlayerName: string;
    expiresAt: string;
    response: string | null;
  };
}

describe("mobile player rally API", () => {
  let getRoute: (event: unknown) => Promise<RouteResult>;
  let putRoute: (event: unknown) => Promise<RouteResult>;

  beforeAll(async () => {
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    getRoute = (await import("../server/api/mobile/v1/player-rallies/[rallyId].get"))
      .default as typeof getRoute;
    putRoute = (await import("../server/api/mobile/v1/player-rallies/[rallyId]/response.put"))
      .default as typeof putRoute;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    h3Mocks.getRouterParam.mockReturnValue("20000000-0000-4000-8000-000000000001");
    h3Mocks.readBody.mockResolvedValue({ response: "joining" });
    userMocks.requireMobileUser.mockResolvedValue({ auth: { uid: "firebase-user" } });
    const data = {
      id: "20000000-0000-4000-8000-000000000001",
      source: "login",
      gamemode: "network",
      targetPlayerName: "CookieFan",
      expiresAt: "2026-07-16T19:05:00.000Z",
      response: null,
    };
    serviceMocks.getPlayerRally.mockResolvedValue(data);
    serviceMocks.respondToPlayerRally.mockResolvedValue({
      data: { ...data, response: "joining" },
      created: true,
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("returns the safe rally view without exposing the target UUID", async () => {
    const response = await getRoute({ context: {} });

    expect(serviceMocks.getPlayerRally).toHaveBeenCalledWith(
      "firebase-user",
      "20000000-0000-4000-8000-000000000001",
    );
    expect(response.data).toMatchObject({ targetPlayerName: "CookieFan", response: null });
    expect(response.data).not.toHaveProperty("targetPlayerId");
    expect(h3Mocks.setHeader).toHaveBeenCalledWith(expect.anything(), "Cache-Control", "no-store");
  });

  it("requires the standard authenticated mobile user before reading a rally", async () => {
    userMocks.requireMobileUser.mockRejectedValueOnce(Object.assign(new Error("unauthorized"), {
      statusCode: 401,
      statusMessage: "Authentication required",
    }));

    await expect(getRoute({ context: {} })).rejects.toMatchObject({ statusCode: 401 });
    expect(serviceMocks.getPlayerRally).not.toHaveBeenCalled();
  });

  it("returns 201 for the first predefined response and 200 for an identical retry", async () => {
    const event = { context: {} };
    await expect(putRoute(event)).resolves.toMatchObject({ data: { response: "joining" } });
    expect(serviceMocks.respondToPlayerRally).toHaveBeenCalledWith(
      "firebase-user",
      "20000000-0000-4000-8000-000000000001",
      "joining",
    );
    expect(h3Mocks.setResponseStatus).toHaveBeenLastCalledWith(event, 201);

    serviceMocks.respondToPlayerRally.mockResolvedValueOnce({
      data: {
        id: "20000000-0000-4000-8000-000000000001",
        source: "login",
        gamemode: "network",
        targetPlayerName: "CookieFan",
        expiresAt: "2026-07-16T19:05:00.000Z",
        response: "joining",
      },
      created: false,
    });
    await putRoute(event);
    expect(h3Mocks.setResponseStatus).toHaveBeenLastCalledWith(event, 200);
  });

  it("rejects any free-text or extra response field before the service call", async () => {
    h3Mocks.readBody.mockResolvedValueOnce({ response: "joining", message: "I will be late" });

    await expect(putRoute({ context: {} })).rejects.toMatchObject({ statusCode: 400 });
    expect(serviceMocks.respondToPlayerRally).not.toHaveBeenCalled();
  });
});
