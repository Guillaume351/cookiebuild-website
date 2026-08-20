import { describe, expect, it } from "vitest";
import {
  assertPlayerFacingEditorialStyle,
  assertPublishableBatch,
  assertImmutablePublishedEntry,
  assertValidSupersession,
  publish,
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
      supersedesSlug: null,
    });
  });

  it("validates immutable supersession links", () => {
    const entry = validateChangelogEntry({
      ...valid,
      slug: "clearer-new-game-release",
      supersedesSlug: valid.slug,
      publishedAt: "2026-08-19T21:00:00+02:00",
    });
    expect(() => assertValidSupersession(entry, {
      contentType: "changelog",
      status: "published",
      publishedAt: new Date(valid.publishedAt),
    }, null)).not.toThrow();
    expect(() => assertValidSupersession(entry, null, null)).toThrow(/not published/);
    expect(() => assertValidSupersession(entry, {
      contentType: "changelog",
      status: "published",
      publishedAt: null,
    }, null)).toThrow(/no valid publication date/);
    expect(() => assertValidSupersession(entry, {
      contentType: "changelog",
      status: "published",
      publishedAt: entry.publishedAt,
    }, null)).toThrow(/published after/);
    expect(() => assertValidSupersession(entry, {
      contentType: "news",
      status: "published",
      publishedAt: new Date(valid.publishedAt),
    }, null)).toThrow(/same content type/);
    expect(() => assertValidSupersession(entry, {
      contentType: "changelog",
      status: "published",
      publishedAt: new Date(valid.publishedAt),
    }, { slug: "another-correction" })).toThrow(/already been superseded/);
    expect(() => validateChangelogEntry({ ...valid, supersedesSlug: valid.slug })).toThrow(/itself/);
  });

  it("rejects internal implementation language from new player-facing notes", () => {
    expect(() => assertPlayerFacingEditorialStyle({
      ...validateChangelogEntry(valid),
      body: "The MOTD was changed.",
      publishedAt: new Date("2026-08-19T21:00:00+02:00"),
    })).toThrow(/internal terminology/);
    expect(() => validateChangelogEntry({
      ...valid,
      slug: "antedated-new-note",
      body: "The MOTD was changed.",
      publishedAt: "2025-01-01T10:00:00Z",
    })).toThrow(/internal terminology/);
    expect(() => validateChangelogEntry({
      ...valid,
      slug: "new-player-experience-polish",
      body: "The MOTD was changed.",
      publishedAt: "2025-01-01T10:00:00Z",
    })).not.toThrow();
  });

  it("rejects an entirely mixed batch before opening a database transaction", async () => {
    const past = validateChangelogEntry(valid);
    const future = validateChangelogEntry({
      ...valid,
      slug: "future-note",
      publishedAt: "2030-01-01T10:00:00Z",
    });
    expect(() => assertPublishableBatch([past, future], new Date("2026-08-19T21:00:00Z")))
      .toThrow(/future-note/);
    await expect(publish([past, future])).rejects.toThrow(/future-note/);
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
      supersedesSlug: entry.supersedesSlug,
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
