import { describe, expect, it } from "vitest";
import { skyblockPeriodicObjective } from "../server/services/mobile-skyblock-periodic-policy";

describe("Skyblock periodic objective rotation", () => {
  // Expected indexes generated with java.util.UUID.hashCode,
  // java.time.LocalDate.hashCode and Math.floorMod on the gameplay JDK.
  it.each([
    ["10000000-0000-4000-8000-000000000001", "2026-09-06", "daily_lumber"],
    ["10000000-0000-4000-8000-000000000002", "2026-09-06", "daily_cobble"],
    ["10000000-0000-4000-8000-000000000003", "2026-09-06", "daily_harvest"],
    ["7fffffff-0000-4000-8000-000000000000", "2026-09-06", "daily_cobble"],
    ["ffffffff-ffff-ffff-ffff-ffffffffffff", "2027-01-01", "daily_cobble"],
  ])("matches Java selection for %s on %s", (player, day, expected) => {
    expect(skyblockPeriodicObjective(player, "daily", day)).toMatchObject({ id: expected, periodStart: day });
  });

  it("keeps the same weekly rotation across a month and year boundary", () => {
    const player = "81111111-2222-4333-8444-555566667777";
    const monday = skyblockPeriodicObjective(player, "weekly", "2026-12-28");
    expect(monday).toMatchObject({ id: "weekly_gatherer", periodStart: "2026-12-28" });
    expect(skyblockPeriodicObjective(player, "weekly", "2027-01-03")).toEqual(monday);
    expect(skyblockPeriodicObjective(player, "weekly", "2027-01-04").periodStart).toBe("2027-01-04");
  });

  it("rejects invalid player IDs and non-calendar dates", () => {
    expect(() => skyblockPeriodicObjective("invalid", "daily", "2026-09-06")).toThrow();
    expect(() => skyblockPeriodicObjective("10000000-0000-4000-8000-000000000001", "daily", "2026-02-30")).toThrow();
  });
});
