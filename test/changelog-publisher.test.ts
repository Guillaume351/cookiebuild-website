import { describe, expect, it } from "vitest";
import { validateChangelogEntry } from "../scripts/publish-changelog.mjs";

describe("changelog publisher validation", () => {
  const valid = {
    slug: "new-game-release",
    title: "New game",
    summary: "A new mode is ready.",
    body: "- First improvement",
    publishedAt: "2026-07-15T10:00:00Z",
  };

  it("normalizes a safe publishable entry", () => {
    expect(validateChangelogEntry(valid)).toMatchObject({
      slug: valid.slug,
      title: valid.title,
      coverImageUrl: null,
    });
  });

  it("rejects invalid slugs, timestamps, and image URLs", () => {
    expect(() => validateChangelogEntry({ ...valid, slug: "Bad Slug" })).toThrow(/slug/);
    expect(() => validateChangelogEntry({ ...valid, publishedAt: "2026-07-15" })).toThrow(/publishedAt/);
    expect(() => validateChangelogEntry({ ...valid, coverImageUrl: "http://example.com/image.png" })).toThrow(/HTTPS/);
  });
});
