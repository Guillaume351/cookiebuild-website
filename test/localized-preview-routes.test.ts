import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { addLocalizedPreviewAliases } from "../utils/localized-preview-routes";
import { SITE_LOCALES, localizedAbsoluteUrl } from "../utils/site-locales";
import { buildMarketingSitemap } from "../utils/marketing-sitemap";
import { mapCatalog } from "../utils/map-catalog";

describe("shared game and map routes", () => {
  it("keeps the exact article and map route in every locale without duplicate aliases", () => {
    const pages = [
      { path: "/nomad-wars", alias: ["/fr/nomad-wars"] },
      { path: "/fat-king", alias: "/fr/fat-king" },
      { path: "/updates/nomad-wars-preview" },
      { path: "/updates/fat-king-preview" },
      { path: "/maps", children: [{ path: ":slug()" }] },
      { path: "/admin", alias: ["/operator"] },
    ];
    addLocalizedPreviewAliases(pages);
    addLocalizedPreviewAliases(pages);
    for (const page of pages.slice(0, 5)) {
      expect(page.alias).toHaveLength(7);
      for (const locale of SITE_LOCALES.filter((locale) => locale.pathSegment)) {
        expect(page.alias).toContain(`/${locale.pathSegment}${page.path}`);
      }
    }
    expect(pages[4]!.children![0]).toMatchObject({
      alias: SITE_LOCALES.filter((locale) => locale.pathSegment)
        .map((locale) => `/${locale.pathSegment}/maps/:slug()`),
    });
    expect(pages[5]!.alias).toEqual(["/operator"]);
  });

  it("publishes unique canonical URLs and reciprocal alternates for all translated previews", () => {
    const sitemap = buildMarketingSitemap();
    const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
    expect(new Set(urls).size).toBe(urls.length);
    for (const path of ["/nomad-wars", "/fat-king", "/maps",
      "/updates/nomad-wars-preview", "/updates/fat-king-preview",
      ...mapCatalog.map((map) => `/maps/${map.slug}`)]) {
      for (const locale of SITE_LOCALES) {
        const canonical = localizedAbsoluteUrl(path, locale);
        expect(urls).toContain(canonical);
        const entry = sitemap.split("<url>").find((entry) => entry.includes(`<loc>${canonical}</loc>`));
        for (const alternate of SITE_LOCALES) {
          expect(entry).toContain(`hreflang="${alternate.hreflang}" href="${localizedAbsoluteUrl(path, alternate)}"`);
        }
        expect(entry).toContain(`hreflang="x-default" href="${localizedAbsoluteUrl(path, "en")}"`);
      }
    }
    expect(urls.every((url) => !url!.includes("?") && !url!.includes("#"))).toBe(true);
  });

  it("does not supply a homepage Open Graph URL to unrelated pages", async () => {
    const config = await readFile(new URL("../nuxt.config.ts", import.meta.url), "utf8");
    expect(config).not.toMatch(/property:\s*["']og:url["'],\s*content:\s*["']https:\/\/www\.cookie-build\.com\/["']/);
  });
});
