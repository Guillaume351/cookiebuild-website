import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  MOBILE_KIT_CATALOG,
  weeklyFreeMicroKits,
} from "../server/services/mobile-kit-catalog";

describe("mobile earned-coin kit shop contract", () => {
  it("stays in parity with the gameplay-owned MicroBattles and SkyWars catalogs", async () => {
    const microSource = await readFile(
      new URL("../../Cookies/MicroBattles/src/main/java/com/cookiebuild/microbattles/kits/KitManager.java", import.meta.url),
      "utf8",
    );
    const skySource = await readFile(
      new URL("../../Cookies/SkyWars/src/main/java/com/cookiebuild/skywars/kit/SkyWarsKit.java", import.meta.url),
      "utf8",
    );

    const microJava = [...microSource.matchAll(
      /register\("([^"]+)",\s*([\d_]+),\s*(\d+),\s*(true|false)\)/g,
    )].map((match) => ({
      name: match[1]!,
      price: Number(match[2]!.replaceAll("_", "")),
      requiredLevel: Number(match[3]),
      starter: match[4] === "true",
    }));
    const microApi = MOBILE_KIT_CATALOG.microbattles.kits;
    expect(microApi.map((kit) => kit.name)).toEqual(microJava.map((kit) => kit.name));
    for (const gameplayKit of microJava.slice(1)) {
      const apiKit = microApi.find((kit) => kit.name === gameplayKit.name)!;
      const firstRequired = Math.max(1, Math.floor(gameplayKit.requiredLevel / 3));
      expect(apiKit.levels).toEqual([
        {
          level: 1,
          price: gameplayKit.starter ? 0 : Math.floor(gameplayKit.price / 2),
          requiredLevel: firstRequired,
          defaultUnlocked: gameplayKit.starter,
        },
        {
          level: 2,
          price: gameplayKit.price,
          requiredLevel: Math.max(firstRequired + 2, Math.floor(gameplayKit.requiredLevel * 2 / 3)),
        },
        { level: 3, price: gameplayKit.price * 2, requiredLevel: gameplayKit.requiredLevel },
      ]);
    }

    const skyJava = [...skySource.matchAll(
      /^\s*(\w+)\("([^"]+)",\s*([\d_]+),\s*(true|false),/gm,
    )].map((match) => ({
      id: match[1]!.toLowerCase(),
      name: match[2]!,
      price: Number(match[3]!.replaceAll("_", "")),
      defaultUnlocked: match[4] === "true",
    }));
    expect(MOBILE_KIT_CATALOG.skywars.kits.map((kit) => ({
      id: kit.id,
      name: kit.name,
      price: kit.levels[0]!.price,
      defaultUnlocked: kit.levels[0]!.defaultUnlocked === true,
    }))).toEqual(skyJava);
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
    expect(source).toContain("FROM playerdata\n       WHERE id = ${actor.playerId} FOR UPDATE");
    expect(source).toContain("FROM coin_transactions");
    expect(source).toContain("kit:${gamemode}:${unlockKey(gamemode, kit, tier.level)}");
  });
});
