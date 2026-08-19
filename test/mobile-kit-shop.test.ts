import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  MOBILE_KIT_CATALOG,
  weeklyFreeMicroKits,
} from "../server/services/mobile-kit-catalog";

describe("mobile earned-coin kit shop contract", () => {
  it("stays in parity with the versioned Docker-local gameplay contract", async () => {
    const contract = JSON.parse(await readFile(
      new URL("../contracts/mobile-kit-catalog-v1.json", import.meta.url),
      "utf8",
    )) as {
      microbattles: Array<{
        name: string;
        price: number;
        requiredLevel: number;
        defaultUnlocked: boolean;
      }>;
      skywars: Array<{
        id: string;
        name: string;
        price: number;
        defaultUnlocked: boolean;
      }>;
    };

    const microContract = contract.microbattles;
    const microApi = MOBILE_KIT_CATALOG.microbattles.kits;
    expect(microApi.map((kit) => kit.name)).toEqual(microContract.map((kit) => kit.name));
    for (const gameplayKit of microContract.slice(1)) {
      const apiKit = microApi.find((kit) => kit.name === gameplayKit.name)!;
      const firstRequired = Math.max(1, Math.floor(gameplayKit.requiredLevel / 3));
      expect(apiKit.levels).toEqual([
        {
          level: 1,
          price: gameplayKit.defaultUnlocked ? 0 : Math.floor(gameplayKit.price / 2),
          requiredLevel: firstRequired,
          defaultUnlocked: gameplayKit.defaultUnlocked,
        },
        {
          level: 2,
          price: gameplayKit.price,
          requiredLevel: Math.max(firstRequired + 2, Math.floor(gameplayKit.requiredLevel * 2 / 3)),
        },
        { level: 3, price: gameplayKit.price * 2, requiredLevel: gameplayKit.requiredLevel },
      ]);
    }

    expect(MOBILE_KIT_CATALOG.skywars.kits.map((kit) => ({
      id: kit.id,
      name: kit.name,
      price: kit.levels[0]!.price,
      defaultUnlocked: kit.levels[0]!.defaultUnlocked === true,
    }))).toEqual(contract.skywars);
  });

  it("keeps weekly free rotation deterministic for every client", () => {
    const now = new Date("2026-08-18T12:00:00Z");
    expect(weeklyFreeMicroKits(now)).toEqual(weeklyFreeMicroKits(now));
    expect(new Set(weeklyFreeMicroKits(now)).size).toBe(2);
    expect(weeklyFreeMicroKits(now)).not.toContain("Default");
  });

  it("retains the locks and unique ledger source needed for safe coin mutations", async () => {
    const source = await readFile(
      new URL("../server/services/mobile-kit-shop.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("requirePrimaryLinkedPlayer(tx, firebaseUid)");
    expect(source).toContain("WHERE id = ${actor.playerId}\n     FOR UPDATE");
    expect(source).toContain("Shared mutation order with CookieDough");
    expect(source).toContain("FROM coin_transactions");
    expect(source).toContain("kit:${gamemode}:${unlockKey(gamemode, kit, tier.level)}");
  });
});
