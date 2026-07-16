import { describe, expect, it } from "vitest";
import { newsBodyText, newsDate } from "../utils/news";

describe("news presentation", () => {
  it("normalizes escaped line breaks without interpreting markup", () => {
    expect(newsBodyText("First paragraph\\nSecond paragraph")).toBe(
      "First paragraph\nSecond paragraph",
    );
    expect(newsBodyText("  <script>alert('no')</script>  ")).toBe(
      "<script>alert('no')</script>",
    );
  });

  it("formats valid dates and handles missing or invalid values", () => {
    expect(newsDate("2026-07-16T08:00:00Z", "en-US")).toBe("July 16, 2026");
    expect(newsDate(null)).toBe("Published recently");
    expect(newsDate("not-a-date")).toBe("Published recently");
  });
});
