import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { requiredBoolean, requiredUuid } from "../server/utils/mobile-validation";

describe("mobile engagement contract", () => {
  it("requires explicit boolean opt-ins and canonical player UUIDs", () => {
    expect(requiredBoolean(true, "enabled")).toBe(true);
    expect(requiredBoolean(false, "enabled")).toBe(false);
    expect(() => requiredBoolean("true", "enabled")).toThrow();
    expect(requiredUuid("0772c75e-d8a7-4e9d-98a1-f1744dde448e", "playerId"))
      .toBe("0772c75e-d8a7-4e9d-98a1-f1744dde448e");
    expect(() => requiredUuid("not-a-player", "playerId")).toThrow();
  });

  it("keeps reminders opt-in and producer delivery durably deduplicated", () => {
    const migration = readFileSync(new URL("../drizzle/0006_mobile_engagement.sql", import.meta.url), "utf8");
    expect(migration).toContain('"daily_reminder_enabled" boolean DEFAULT false NOT NULL');
    expect(migration).toContain('"weekly_reminder_enabled" boolean DEFAULT false NOT NULL');
    expect(migration).toContain('"friend_online_enabled" boolean DEFAULT false NOT NULL');
    expect(migration).toContain('"mobile_notification_outbox_dedupe_key_uq"');
  });

  it("limits online-alert selections to accepted friends and respects blocks", () => {
    const service = readFileSync(new URL("../server/services/mobile-engagement.ts", import.meta.url), "utf8");
    expect(service).toContain("friendship.status = 'accepted'");
    expect(service).toContain("FROM player_blocks block");
    expect(service).not.toContain("FROM playerdata target\n       ORDER BY");
  });

  it("intentionally suppresses rather than defers quiet-hour engagement pushes", () => {
    const worker = readFileSync(new URL(
      "../server/services/mobile-notification-outbox.ts",
      import.meta.url,
    ), "utf8");
    expect(worker).toContain("if (!allowed) suppressed += 1");
    expect(worker).toContain("retry: [...new Set(retry)]");
    expect(worker).toContain("suppressed,");
    expect(worker).toContain("excludedOnline,");
    expect(worker).toContain('preference !== "rally" || !recipient.linkedPlayerOnline');
  });

  it("polls the outbox frequently enough for time-sensitive player calls", () => {
    const plugin = readFileSync(new URL(
      "../server/plugins/mobile-notification-outbox.ts",
      import.meta.url,
    ), "utf8");
    expect(plugin).toContain('value : 5_000');
    expect(plugin).toContain('value >= 5_000');
  });

  it("localizes engagement notifications and describes explicit accepted-friend selection", () => {
    const producer = readFileSync(new URL(
      "../server/services/mobile-engagement-notifications.ts",
      import.meta.url,
    ), "utf8");
    expect(producer).toContain("Ton objectif Cookie Build du jour t’attend");
    expect(producer).toContain("Nouveaux objectifs Cookie Build de la semaine");
    expect(producer).toContain("Un ami accepté que tu as sélectionné");
    expect(producer).toContain("An accepted friend you selected");
    expect(producer).not.toContain("friend you follow");
  });
});
