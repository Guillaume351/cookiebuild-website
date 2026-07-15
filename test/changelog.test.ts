import { describe, expect, it } from "vitest";
import { changelogBodyLines, changelogDate } from "../utils/changelog";

describe("changelog presentation", () => {
  it("turns line-oriented release notes into safe display items", () => {
    expect(changelogBodyLines("- First change\n• Second change\n\nThird change")).toEqual([
      "First change",
      "Second change",
      "Third change",
    ]);
    expect(changelogBodyLines("- First change\\n- Second change")).toEqual([
      "First change",
      "Second change",
    ]);
  });

  it("formats valid dates and handles missing or invalid values", () => {
    expect(changelogDate("2026-07-15T10:00:00Z", "en-US")).toBe("July 15, 2026");
    expect(changelogDate(null)).toBe("Coming soon");
    expect(changelogDate("not-a-date")).toBe("Coming soon");
  });
});
