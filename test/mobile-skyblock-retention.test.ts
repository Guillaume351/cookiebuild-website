import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  SKYBLOCK_NOTIFICATION_LOCALES,
  skyblockActionNotificationsEnabled,
  skyblockNotificationCopy,
  skyblockNotificationItemName,
} from "../server/services/mobile-skyblock-notification-copy";

describe("mobile Skyblock retention contract", () => {
  it("adds opt-in preferences and deduplicated bounded producers", async () => {
    const [migration, producer, service] = await Promise.all([
      readFile(
        new URL("../drizzle/0014_skyblock_retention.sql", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../server/services/mobile-engagement-notifications.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../server/services/mobile-skyblock.ts", import.meta.url),
        "utf8",
      ),
    ]);
    for (const column of [
      "skyblock_market_sold_enabled",
      "skyblock_worker_full_enabled",
      "skyblock_objective_ready_enabled",
    ]) {
      expect(migration).toContain(`${column}\" boolean DEFAULT false NOT NULL`);
    }
    expect(producer).toContain("LIMIT 100");
    expect(producer.match(/existing\.dedupe_key/g)).toHaveLength(2);
    expect(producer).toContain("ON CONFLICT (dedupe_key)");
    expect(producer).toContain("skyblock-worker-full:");
    expect(producer).toContain("skyblock-objective-ready:");
    expect(service).toContain("skyblock-market-sold:");
    expect(service.indexOf("skyblock-market-sold:")).toBeLessThan(
      service.indexOf(
        "saveIdempotentResponse",
        service.indexOf("skyblock-market-sold:"),
      ),
    );
  });

  it("gates actionable notifications on management writes", async () => {
    const producer = await readFile(
      new URL(
        "../server/services/mobile-engagement-notifications.ts",
        import.meta.url,
      ),
      "utf8",
    );
    expect(producer).toMatch(
      /skyblockActionNotificationsEnabled\(capabilities\)/,
    );
    expect(
      skyblockActionNotificationsEnabled({
        skyblockCompanion: true,
        skyblockManagementWrites: true,
      }),
    ).toBe(true);
    expect(
      skyblockActionNotificationsEnabled({
        skyblockCompanion: true,
        skyblockManagementWrites: false,
      }),
    ).toBe(false);
    expect(
      skyblockActionNotificationsEnabled({
        skyblockCompanion: false,
        skyblockManagementWrites: true,
      }),
    ).toBe(false);
  });

  it("localizes Skyblock notification copy and item names in all mobile locales", () => {
    const coal = {
      en: "Coal",
      bg: "Въглища",
      es: "Carbón",
      hi: "कोयला",
      pt: "Carvão",
      fr: "Charbon",
      de: "Kohle",
      it: "Carbone",
    } as const;
    for (const locale of SKYBLOCK_NOTIFICATION_LOCALES) {
      const copy = skyblockNotificationCopy(
        `${locale}-${locale.toUpperCase()}`,
      );
      expect(copy.workerTitle.trim()).not.toBe("");
      expect(copy.workerBody.trim()).not.toBe("");
      expect(copy.objectiveTitle.trim()).not.toBe("");
      expect(copy.objectiveBody.trim()).not.toBe("");
      expect(copy.marketTitle.trim()).not.toBe("");
      expect(copy.marketBody).toContain("{item}");
      expect(copy.marketBody).toContain("{coins}");
      expect(skyblockNotificationItemName(locale, "coal", "Coal")).toBe(
        coal[locale],
      );
    }
    expect(skyblockNotificationCopy("unknown")).toEqual(
      skyblockNotificationCopy("en"),
    );
  });
});
