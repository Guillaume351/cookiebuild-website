import { describe, expect, it } from "vitest";
import { renderMarketingSitemap } from "../utils/marketing-sitemap";
import { paginateUpdates, updateArticleJsonLd, updateLanguage, type UpdatePost } from "../utils/updates";

const post = (overrides: Partial<UpdatePost> = {}): UpdatePost => ({
  id: "1",
  slug: "nine-modes-ux",
  contentType: "changelog",
  title: "Clearer menus across the nine modes",
  summary: "Spectators and votes are easier to follow in every mode.",
  body: "- One\n- Two",
  coverImageUrl: null,
  publishedAt: "2026-09-26T10:00:00Z",
  ...overrides,
});

describe("indexable update articles", () => {
  it("detects the single language each article is written in", () => {
    expect(updateLanguage(post())).toBe("en");
    expect(updateLanguage(post({ title: "Des parties plus lisibles dans nos neuf modes de jeu", summary: "Les menus sont plus clairs." }))).toBe("fr");
    expect(updateLanguage(post({ title: "Fat King : découvrez la couronne qui pèse lourd", summary: "" }))).toBe("fr");
    expect(updateLanguage(post({ title: "Minecraft Java 26.3 support", summary: "Play on the latest release." }))).toBe("en");
  });

  it("lists each article once with lastmod at its canonical language URL", () => {
    const sitemap = renderMarketingSitemap([
      { slug: "nine-modes-ux", publishedAt: "2026-09-26T10:00:00Z", title: "Clearer menus", summary: "Now in every mode." },
      { slug: "neuf-modes", publishedAt: "2026-09-26T10:00:00Z", title: "Des parties plus lisibles", summary: "Les menus sont plus clairs." },
      { slug: "nine-modes-ux", publishedAt: "2026-09-26T10:00:00Z" },
      { slug: "Bad Slug", publishedAt: null },
    ]);
    expect(sitemap).toContain("<loc>https://www.cookie-build.com/updates/nine-modes-ux</loc>\n    <lastmod>2026-09-26T10:00:00.000Z</lastmod>");
    expect(sitemap).toContain("<loc>https://www.cookie-build.com/fr/updates/neuf-modes</loc>");
    expect(sitemap.match(/updates\/nine-modes-ux<\/loc>/g)).toHaveLength(1);
    expect(sitemap).not.toContain("Bad Slug");
  });

  it("describes each permalink as a BlogPosting published by the organization", () => {
    const jsonLd = updateArticleJsonLd(post(), "https://www.cookie-build.com/updates/nine-modes-ux");
    expect(jsonLd["@type"]).toBe("BlogPosting");
    expect(jsonLd.datePublished).toBe("2026-09-26T10:00:00.000Z");
    expect(jsonLd.publisher["@type"]).toBe("Organization");
    expect(updateArticleJsonLd(post({ contentType: "news" }), "x")["@type"]).toBe("NewsArticle");
  });

  it("paginates the list and clamps out-of-range pages", () => {
    const items = Array.from({ length: 23 }, (_, index) => index);
    expect(paginateUpdates(items, 1, 10)).toMatchObject({ page: 1, pageCount: 3, items: items.slice(0, 10) });
    expect(paginateUpdates(items, 3, 10).items).toEqual([20, 21, 22]);
    expect(paginateUpdates(items, 99, 10).page).toBe(3);
    expect(paginateUpdates([], 1, 10)).toMatchObject({ page: 1, pageCount: 1, items: [] });
  });
});
