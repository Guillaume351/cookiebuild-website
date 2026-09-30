import { describe, expect, it } from "vitest";
import {
  addDaysToDateKey,
  isoWeekKeyOfDateKey,
  isoWeekdayOfDateKey,
  nextParisMidnight,
  parisDateKey,
  parisWallTimeToUtc,
} from "../server/utils/paris-time";

describe("Europe/Paris calendar helpers", () => {
  it("uses the Paris calendar day rather than UTC", () => {
    expect(parisDateKey(new Date("2026-09-30T21:59:59Z"))).toBe("2026-09-30");
    expect(parisDateKey(new Date("2026-09-30T22:00:00Z"))).toBe("2026-10-01");
    expect(parisDateKey(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });

  it("converts Paris wall-clock times across daylight-saving transitions", () => {
    expect(parisWallTimeToUtc("2026-09-30", 21).toISOString()).toBe("2026-09-30T19:00:00.000Z");
    expect(parisWallTimeToUtc("2026-11-04", 21).toISOString()).toBe("2026-11-04T20:00:00.000Z");
    // 2026-10-25: clocks go back at 03:00 CEST; midnight is still CEST.
    expect(parisWallTimeToUtc("2026-10-25", 0).toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(parisWallTimeToUtc("2026-10-26", 0).toISOString()).toBe("2026-10-25T23:00:00.000Z");
    // 2027-03-28: clocks go forward at 02:00 CET.
    expect(parisWallTimeToUtc("2027-03-28", 21).toISOString()).toBe("2027-03-28T19:00:00.000Z");
  });

  it("computes the next Paris midnight", () => {
    expect(nextParisMidnight(new Date("2026-09-30T12:00:00Z")).toISOString()).toBe("2026-09-30T22:00:00.000Z");
    expect(nextParisMidnight(new Date("2026-09-30T22:30:00Z")).toISOString()).toBe("2026-10-01T22:00:00.000Z");
    expect(nextParisMidnight(new Date("2026-10-25T12:00:00Z")).toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });

  it("walks calendar dates, weekdays and ISO weeks", () => {
    expect(addDaysToDateKey("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDaysToDateKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(isoWeekdayOfDateKey("2026-09-30")).toBe(3);
    expect(isoWeekdayOfDateKey("2026-10-04")).toBe(7);
    expect(isoWeekKeyOfDateKey("2026-09-28")).toBe("2026-W40");
    expect(isoWeekKeyOfDateKey("2027-01-01")).toBe("2026-W53");
  });
});
