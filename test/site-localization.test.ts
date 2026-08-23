import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { gameLandings } from "../utils/game-landings";
import { localizedGameLandings } from "../utils/game-landings-localized";
import { buildMarketingSitemap } from "../utils/marketing-sitemap";
import {
  LOCALIZED_MARKETING_PATHS,
  SITE_LOCALES,
  localizedAbsoluteUrl,
  localizedSitePath,
  siteLocaleFromPath,
  stripSiteLocale,
} from "../utils/site-locales";
import { SITE_COPY } from "../utils/site-copy";

const readSource = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

describe("country-targeted public-site localization", () => {
  it("maps every requested country to a complete regional language target", () => {
    expect(SITE_LOCALES.map(({ code, country, htmlLang, pathSegment }) => ({ code, country, htmlLang, pathSegment }))).toEqual([
      { code: "en", country: "Australia", htmlLang: "en-AU", pathSegment: "" },
      { code: "fr", country: "France", htmlLang: "fr-FR", pathSegment: "fr" },
      { code: "de", country: "Germany", htmlLang: "de-DE", pathSegment: "de" },
      { code: "it", country: "Italy", htmlLang: "it-IT", pathSegment: "it" },
      { code: "bg", country: "Bulgaria", htmlLang: "bg-BG", pathSegment: "bg" },
      { code: "es", country: "Peru", htmlLang: "es-PE", pathSegment: "es" },
      { code: "hi", country: "India", htmlLang: "hi-IN", pathSegment: "hi" },
      { code: "pt-BR", country: "Brazil", htmlLang: "pt-BR", pathSegment: "pt-br" },
    ]);

    for (const locale of SITE_LOCALES) {
      expect(SITE_COPY[locale.code].home.title.trim()).not.toBe("");
      expect(SITE_COPY[locale.code].home.description.trim()).not.toBe("");
      expect(SITE_COPY[locale.code].home.features).toHaveLength(3);
      expect(SITE_COPY[locale.code].home.faqs).toHaveLength(6);
    }
  });

  it("resolves and switches prefixed routes without changing the stable page slug", () => {
    expect(siteLocaleFromPath("/bg/skywars").code).toBe("bg");
    expect(siteLocaleFromPath("/es/games").htmlLang).toBe("es-PE");
    expect(siteLocaleFromPath("/hi").country).toBe("India");
    expect(siteLocaleFromPath("/pt-br/bedwars").code).toBe("pt-BR");
    expect(siteLocaleFromPath("/fr/skyblock").htmlLang).toBe("fr-FR");
    expect(siteLocaleFromPath("/de/games").code).toBe("de");
    expect(siteLocaleFromPath("/it/bedwars").country).toBe("Italy");
    expect(stripSiteLocale("/pt-br/build-battle?from=menu")).toBe("/build-battle");
    expect(localizedSitePath("/es/skywars", "bg")).toBe("/bg/skywars");
    expect(localizedSitePath("/hi", "en")).toBe("/");
  });

  it("provides localized visible copy and metadata for every game page", () => {
    for (const locale of SITE_LOCALES) {
      const localized = localizedGameLandings(locale.code);
      expect(localized).toHaveLength(gameLandings.length);
      for (const game of localized) {
        expect(game.path).toBe(localizedSitePath(`/${game.slug}`, locale.code));
        expect(game.metaDescription).toContain("play.cookie-build.com");
        expect(game.metaDescription).toContain("19132");
        expect(game.heroIntro.trim()).not.toBe("");
        expect(game.steps).toHaveLength(3);
        expect(game.faqs.length).toBeGreaterThanOrEqual(4);
        expect(game.faqs.every((faq) => faq.question.trim() && faq.answer.trim())).toBe(true);
      }
      if (locale.code !== "en") {
        expect(localized.map((game) => game.heroIntro)).not.toEqual(gameLandings.map((game) => game.heroIntro));
      }
    }
  });

  it("exposes crawlable aliases, self canonicals and reciprocal hreflang links", async () => {
    const [home, catalog, seo, header] = await Promise.all([
      readSource("../pages/index.vue"),
      readSource("../pages/games/index.vue"),
      readSource("../composables/useGameLandingSeo.ts"),
      readSource("../components/AppHeader.vue"),
    ]);

    expect(home).toContain('alias: ["/fr", "/de", "/it", "/bg", "/es", "/hi", "/pt-br"]');
    expect(home).toContain("innerHTML: JSON.stringify");
    expect(home).not.toContain("children: JSON.stringify");
    expect(catalog).toContain('"/fr/games", "/de/games", "/it/games", "/bg/games", "/es/games", "/hi/games", "/pt-br/games"');
    expect(seo).toContain("localizedSeoLinks");
    expect(seo).toContain('htmlAttrs: { lang: locale.value.htmlLang }');
    expect(header).toContain('v-for="language in SITE_LOCALES"');
    expect(header).toContain("switchLocalePath(code)");
    expect(header).toContain("{ external: true }");
  });

  it("generates one indexable URL per locale and page with complete alternates", () => {
    const sitemap = buildMarketingSitemap();
    const localizedUrlCount = LOCALIZED_MARKETING_PATHS.length * SITE_LOCALES.length;
    expect((sitemap.match(/<loc>/g) || []).length).toBe(localizedUrlCount + 7);
    expect(sitemap).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');

    for (const path of LOCALIZED_MARKETING_PATHS) {
      for (const locale of SITE_LOCALES) {
        expect(sitemap).toContain(`<loc>${localizedAbsoluteUrl(path, locale)}</loc>`);
        expect(sitemap).toContain(`hreflang="${locale.hreflang}" href="${localizedAbsoluteUrl(path, locale)}"`);
      }
      expect(sitemap).toContain(`hreflang="x-default" href="${localizedAbsoluteUrl(path, "en")}"`);
    }
  });
});
