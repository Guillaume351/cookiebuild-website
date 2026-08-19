import { describe, expect, it } from "vitest";
import {
  assertImmutablePublishedEntry,
  validateChangelogEntry,
} from "../scripts/publish-changelog.mjs";

describe("changelog publisher validation", () => {
  const valid = {
    slug: "new-game-release",
    contentType: "changelog",
    title: "New game",
    summary: "A new mode is ready.",
    body: "- First improvement",
    publishedAt: "2026-07-15T10:00:00Z",
  };

  it("normalizes a safe publishable entry", () => {
    expect(validateChangelogEntry(valid)).toMatchObject({
      slug: valid.slug,
      contentType: "changelog",
      title: valid.title,
      coverImageUrl: null,
    });
  });

  it("rejects invalid slugs, timestamps, and image URLs", () => {
    expect(() => validateChangelogEntry({ ...valid, slug: "Bad Slug" })).toThrow(/slug/);
    expect(() => validateChangelogEntry({ ...valid, contentType: undefined })).toThrow(/contentType/);
    expect(validateChangelogEntry({ ...valid, contentType: "news" })).toMatchObject({ contentType: "news" });
    expect(() => validateChangelogEntry({ ...valid, contentType: "announcement" })).toThrow(/contentType/);
    expect(() => validateChangelogEntry({ ...valid, publishedAt: "2026-07-15" })).toThrow(/publishedAt/);
    expect(() => validateChangelogEntry({ ...valid, coverImageUrl: "http://example.com/image.png" })).toThrow(/HTTPS/);
  });

  it("accepts only an identical idempotent retry for an existing slug", () => {
    const entry = validateChangelogEntry(valid);
    const published = {
      contentType: entry.contentType,
      title: entry.title,
      summary: entry.summary,
      body: entry.body,
      coverImageUrl: entry.coverImageUrl,
      status: "published",
      publishedAt: new Date(entry.publishedAt),
    };

    expect(() => assertImmutablePublishedEntry(entry, published)).not.toThrow();
    expect(() => assertImmutablePublishedEntry(entry, {
      ...published,
      body: "silently rewritten",
    })).toThrow(/Immutable changelog conflict/);
    expect(() => assertImmutablePublishedEntry(entry, {
      ...published,
      status: "draft",
    })).toThrow(/Immutable changelog conflict/);
  });
});
