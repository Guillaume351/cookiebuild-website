import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMobileServerStatus } from "../server/services/mobile-status";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("public Minecraft status", () => {
  it("checks Java and Bedrock independently", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/java/")) {
        return {
          online: true,
          players: { online: 0, max: 100 },
          version: { name_clean: "1.21" },
          motd: { clean: "Cookie Build" },
        };
      }
      return {
        online: false,
        players: { online: 0, max: 100 },
      };
    });
    vi.stubGlobal("$fetch", fetchMock);

    const status = await fetchMobileServerStatus();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(status.online).toBe(true);
    expect(status.java).toMatchObject({ online: true, reachable: true, players: 0 });
    expect(status.bedrock).toMatchObject({ online: false, reachable: true, players: 0 });
  });

  it("does not describe a failed external check as a confirmed outage", async () => {
    vi.stubGlobal("$fetch", vi.fn().mockRejectedValue(new Error("probe unavailable")));

    const status = await fetchMobileServerStatus();

    expect(status.online).toBe(false);
    expect(status.java).toMatchObject({ online: false, reachable: false });
    expect(status.bedrock).toMatchObject({ online: false, reachable: false });
  });
});
