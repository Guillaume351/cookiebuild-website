import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("../db/client", () => ({ default: {} }));

import {
  buildOgImageUrl,
  buildPagePath,
  galleryListPath,
  localizedThemeName,
  normalizeGalleryLocale,
} from "../shared/buildbattle-gallery";
import { BUILDBATTLE_THEME_NAMES } from "../shared/buildbattle-themes";
import {
  decodeGalleryCursor,
  encodeGalleryCursor,
  galleryPeriodStart,
  parseGalleryListQuery,
} from "../server/buildbattle/query";
import { galleryListStatement, galleryPage, type BuildRow } from "../server/services/buildbattle-gallery";
import { prefersFrench, shortLinkTarget } from "../server/buildbattle/short-link";

const dialect = new PgDialect();
const render = (query: ReturnType<typeof galleryListStatement>) => {
  const rendered = dialect.sqlToQuery(query);
  return { sql: rendered.sql.replace(/\s+/g, " "), params: rendered.params };
};

function row(index: number, likeCount: number): BuildRow {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    shortCode: `code${String(index).padStart(4, "0")}`,
    playerName: "Steve",
    themeKey: "farm",
    themeName: "Farm",
    outcome: "judged",
    placement: 1,
    builders: 4,
    blockCount: 120,
    sizeX: 27,
    sizeY: 23,
    sizeZ: 27,
    likeCount,
    createdAt: new Date(Date.UTC(2026, 9, 1, 12, 0, index)),
    createdUs: String(Date.UTC(2026, 9, 1, 12, 0, index) * 1000 + 123),
  };
}

describe("gallery cursor pagination", () => {
  it("round-trips opaque keyset cursors with microsecond precision", () => {
    const top = { sort: "top" as const, likeCount: 12, createdUs: "1790000000123456", id: "0b7c6f1e-3c1a-4c7e-9d65-1f1a2b3c4d5e" };
    expect(decodeGalleryCursor(encodeGalleryCursor(top), "top")).toEqual(top);
    const recent = { sort: "recent" as const, likeCount: 0, createdUs: "1790000000123456", id: top.id };
    expect(decodeGalleryCursor(encodeGalleryCursor(recent), "recent")).toEqual(recent);
    expect(encodeGalleryCursor(top)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("rejects tampered or mismatched cursors", () => {
    const recent = encodeGalleryCursor({ sort: "recent", likeCount: 0, createdUs: "1", id: "0b7c6f1e-3c1a-4c7e-9d65-1f1a2b3c4d5e" });
    expect(() => decodeGalleryCursor(recent, "top")).toThrow(/Invalid cursor/);
    expect(() => decodeGalleryCursor("not-a-cursor", "top")).toThrow(/Invalid cursor/);
    expect(() => decodeGalleryCursor(Buffer.from("t|1|1|'; DROP TABLE x").toString("base64url"), "top")).toThrow();
    expect(decodeGalleryCursor(undefined, "top")).toBeNull();
  });

  it("returns limit items and a next cursor pointing at the last one", () => {
    const query = parseGalleryListQuery({ sort: "top", limit: "2", locale: "fr" });
    const page = galleryPage([row(1, 9), row(2, 7), row(3, 5)], query);
    expect(page.items.map((item) => item.likeCount)).toEqual([9, 7]);
    expect(decodeGalleryCursor(page.nextCursor, "top")).toEqual({
      sort: "top",
      likeCount: 7,
      createdUs: row(2, 7).createdUs,
      id: row(2, 7).id,
    });
    expect(galleryPage([row(1, 9)], query).nextCursor).toBeNull();
    expect(page.items[0]).toMatchObject({
      theme: "Ferme",
      themeKey: "farm",
      size: [27, 23, 27],
      url: "https://www.cookie-build.com/fr/galerie/code0001",
      ogImageUrl: "https://www.cookie-build.com/api/builds/code0001/og.png?v=9&locale=fr",
    });
  });

  it("filters published builds and seeks strictly after the cursor in index order", () => {
    const cursor = encodeGalleryCursor({ sort: "top", likeCount: 7, createdUs: "1790000000123456", id: row(2, 7).id });
    const top = render(galleryListStatement(parseGalleryListQuery({ sort: "top", period: "week", cursor, limit: "24", player: "Steve" }), new Date("2026-10-03T12:00:00Z")));
    expect(top.sql).toContain("build.status = 'published'");
    expect(top.sql).toContain("(build.like_count, build.created_at, build.id) < ($");
    expect(top.sql).toContain("TIMESTAMPTZ 'epoch' + $");
    expect(top.sql).toContain("ORDER BY build.like_count DESC, build.created_at DESC, build.id DESC");
    expect(top.sql).toContain("lower(player.name) = lower($");
    expect(top.params).toContain("2026-09-27T22:00:00.000Z"); // Monday 2026-09-28 00:00 Paris
    expect(top.params).toContain(25); // limit + 1
    const recent = render(galleryListStatement(parseGalleryListQuery({ sort: "recent" })));
    expect(recent.sql).toContain("ORDER BY build.created_at DESC, build.id DESC");
    expect(recent.sql).not.toContain("build.created_at >=");
  });

  it("validates list parameters", () => {
    expect(parseGalleryListQuery({})).toMatchObject({ sort: "top", period: "all", limit: 24, cursor: null, player: null, locale: null });
    expect(parseGalleryListQuery({ limit: "500" }).limit).toBe(48);
    expect(() => parseGalleryListQuery({ sort: "best" })).toThrow(/Invalid sort/);
    expect(() => parseGalleryListQuery({ period: "year" })).toThrow(/Invalid period/);
    expect(() => parseGalleryListQuery({ limit: "0" })).toThrow(/Invalid limit/);
    expect(() => parseGalleryListQuery({ player: "a\u0000b" })).toThrow(/Invalid player/);
    expect(parseGalleryListQuery({ player: ".Bedrock Kid" }).player).toBe(".Bedrock Kid");
  });
});

describe("gallery periods (Europe/Paris)", () => {
  it("starts weeks on Monday and months on the 1st at Paris midnight, across DST", () => {
    expect(galleryPeriodStart("week", new Date("2026-10-03T12:00:00Z"))?.toISOString()).toBe("2026-09-27T22:00:00.000Z");
    // Sunday 23:30 Paris still belongs to the week that started Monday.
    expect(galleryPeriodStart("week", new Date("2026-10-04T21:30:00Z"))?.toISOString()).toBe("2026-09-27T22:00:00.000Z");
    // Winter time (UTC+1) after 25 October 2026.
    expect(galleryPeriodStart("week", new Date("2026-11-04T12:00:00Z"))?.toISOString()).toBe("2026-11-01T23:00:00.000Z");
    expect(galleryPeriodStart("month", new Date("2026-10-03T12:00:00Z"))?.toISOString()).toBe("2026-09-30T22:00:00.000Z");
    expect(galleryPeriodStart("all")).toBeNull();
  });
});

describe("gallery localization and links", () => {
  it("localizes theme names from the BuildBattles bundles with an English fallback", () => {
    expect(Object.keys(BUILDBATTLE_THEME_NAMES).length).toBeGreaterThanOrEqual(49);
    expect(localizedThemeName("summer", "Summer", "fr")).toBe("Été");
    expect(localizedThemeName("summer", "Summer", "pt-BR")).toBe(BUILDBATTLE_THEME_NAMES.summer!["pt-BR"]);
    expect(localizedThemeName("summer", "Summer", "it")).toBe("Summer");
    expect(localizedThemeName("unknown_theme", "Custom", "fr")).toBe("Custom");
    expect(localizedThemeName("summer", "Summer", null)).toBe("Summer");
    expect(normalizeGalleryLocale("fr-FR")).toBe("fr");
    expect(normalizeGalleryLocale("pt_BR")).toBe("pt-BR");
    expect(normalizeGalleryLocale("xx")).toBeNull();
  });

  it("builds localized page paths and versioned share-card URLs", () => {
    expect(galleryListPath(null)).toBe("/builds");
    expect(galleryListPath("fr")).toBe("/fr/galerie");
    expect(buildPagePath("Ab12Cd34", "de")).toBe("/de/builds/Ab12Cd34");
    expect(buildPagePath("Ab12Cd34", "pt-BR")).toBe("/pt-br/builds/Ab12Cd34");
    expect(buildOgImageUrl("Ab12Cd34", 3, null)).toBe("https://www.cookie-build.com/api/builds/Ab12Cd34/og.png?v=3");
  });

  it("redirects /b/<code> to the French gallery only for French browsers", () => {
    expect(prefersFrench("fr-FR,fr;q=0.9,en;q=0.8")).toBe(true);
    expect(prefersFrench("en-US,fr;q=0.9")).toBe(false);
    expect(prefersFrench("de;q=0.5,fr;q=0.8")).toBe(true);
    expect(prefersFrench(undefined)).toBe(false);
    expect(shortLinkTarget("Ab12Cd34", "fr")).toBe("/fr/galerie/Ab12Cd34");
    expect(shortLinkTarget("Ab12Cd34", "es-ES")).toBe("/builds/Ab12Cd34");
  });
});
