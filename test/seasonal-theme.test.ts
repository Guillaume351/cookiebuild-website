import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { COIN_COSMETICS } from "../shared/cosmetics-catalog";
import { SEASONAL_THEMES, isSeasonalThemeId, isWithinSeason, seasonWindow } from "../shared/seasonal-themes";
import { SEASONAL_COPY } from "../utils/seasonal-copy";
import { SEASONAL_UPDATE_SLUGS, activeSeasonalTheme, seasonalUpdatePath } from "../utils/seasonal-theme";
import { SITE_LOCALES, localizedSitePath, supportsLocalizedSitePath } from "../utils/site-locales";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");
const parisTime = (date: Date) => new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
}).format(date);

describe("seasonal theme windows", () => {
  it("runs Halloween from 12 October 00:00 to 3 November 00:00, Paris time", () => {
    const halloween = seasonWindow("halloween");
    expect(parisTime(new Date(halloween.availableFrom))).toBe("12/10/2026, 00:00");
    expect(parisTime(new Date(halloween.availableUntil))).toBe("03/11/2026, 00:00");
    expect(SEASONAL_THEMES.map((theme) => theme.id)).toEqual(["halloween"]);
    expect(new Set(SEASONAL_THEMES.map((theme) => theme.id)).size).toBe(SEASONAL_THEMES.length);
    for (const theme of SEASONAL_THEMES) {
      expect(Date.parse(theme.availableUntil)).toBeGreaterThan(Date.parse(theme.availableFrom));
    }
  });

  it("activates the skin inside the half-open window only", () => {
    expect(activeSeasonalTheme(new Date("2026-10-11T21:59:59.999Z"))).toBeNull();
    expect(activeSeasonalTheme(new Date("2026-10-11T22:00:00Z"))).toBe("halloween");
    // Across the 25 October daylight saving change.
    expect(activeSeasonalTheme(new Date("2026-10-25T12:00:00Z"))).toBe("halloween");
    expect(activeSeasonalTheme(new Date("2026-10-31T21:00:00+01:00"))).toBe("halloween");
    expect(activeSeasonalTheme(new Date("2026-11-02T22:59:59.999Z"))).toBe("halloween");
    expect(activeSeasonalTheme(new Date("2026-11-02T23:00:00Z"))).toBeNull();
    expect(activeSeasonalTheme(new Date("2026-12-24T12:00:00Z"))).toBeNull();
    expect([null, "halloween"]).toContain(activeSeasonalTheme());
  });

  it("recognises theme ids and windows without depending on the caller's clock", () => {
    expect(isSeasonalThemeId("halloween")).toBe(true);
    expect(isSeasonalThemeId("christmas")).toBe(false);
    const window = { availableFrom: "2026-12-01T00:00:00+01:00", availableUntil: "2027-01-04T00:00:00+01:00" };
    expect(isWithinSeason(window, new Date("2026-12-25T00:00:00+01:00"))).toBe(true);
    expect(isWithinSeason(window, new Date("2027-01-04T00:00:00+01:00"))).toBe(false);
  });

  it("sells seasonal coin items in exactly the theme window", () => {
    const seasonal = COIN_COSMETICS.filter((item) => "season" in item);
    expect(seasonal.length).toBeGreaterThan(0);
    for (const item of seasonal) expect(SEASONAL_THEMES).toContain(item.season);
  });
});

describe("seasonal copy and links", () => {
  it("localizes the banner and the limited-edition label in every header language", () => {
    for (const theme of SEASONAL_THEMES) {
      expect(Object.keys(SEASONAL_COPY[theme.id]).sort()).toEqual(SITE_LOCALES.map(({ code }) => code).sort());
      const titles = new Set<string>();
      for (const { code } of SITE_LOCALES) {
        const copy = SEASONAL_COPY[theme.id][code];
        for (const text of Object.values(copy)) expect(text.trim().length).toBeGreaterThan(5);
        expect(copy.bannerText).toContain("13");
        titles.add(copy.bannerTitle);
      }
      expect(titles.size).toBe(SITE_LOCALES.length);
    }
    expect(SEASONAL_COPY.halloween.fr.limitedEdition).toBe("Édition limitée Halloween · jusqu’au 2 novembre");
    expect(SEASONAL_COPY.halloween.en.limitedEdition).toBe("Limited Halloween edition · until November 2");
    // French speaks to the player with "tu".
    for (const text of Object.values(SEASONAL_COPY.halloween.fr)) {
      expect(text).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b/i);
    }
  });

  it("names the last day of the window in the labels", () => {
    const lastDay = new Date(Date.parse(seasonWindow("halloween").availableUntil) - 1);
    const day = (locale: string) => new Intl.DateTimeFormat(locale, { timeZone: "Europe/Paris", day: "numeric", month: "long" }).format(lastDay);
    expect(SEASONAL_COPY.halloween.fr.limitedEdition).toContain(day("fr"));
    expect(SEASONAL_COPY.halloween.en.limitedEdition).toContain(day("en-US"));
    expect(SEASONAL_COPY.halloween.it.limitedEdition).toContain(day("it"));
    expect(SEASONAL_COPY.halloween.fr.bannerEyebrow).toContain(day("fr"));
  });

  it("links the banner to the localized release-note route", () => {
    expect(SEASONAL_UPDATE_SLUGS.halloween).toBe("halloween-sur-cookie-build");
    const path = seasonalUpdatePath("halloween");
    expect(path).toBe("/updates/halloween-sur-cookie-build");
    expect(supportsLocalizedSitePath(path)).toBe(true);
    expect(localizedSitePath(path, "fr")).toBe("/fr/updates/halloween-sur-cookie-build");
    expect(localizedSitePath(path, "en")).toBe("/updates/halloween-sur-cookie-build");
    expect(localizedSitePath(path, "pt-BR")).toBe("/pt-br/updates/halloween-sur-cookie-build");
  });
});

describe("seasonal rendering", () => {
  it("computes the season once for SSR and hydration", async () => {
    const composable = await read("../composables/useSeasonalTheme.ts");
    expect(composable).toContain('useState<number>("seasonal-theme-now", () => Date.now())');
    expect(composable).toContain("activeSeasonalTheme(now.value)");
  });

  it("skins the homepage hero only while a season is active, without motion when reduced", async () => {
    const page = await read("../pages/index.vue");
    expect(page).toContain("useSeasonalTheme()");
    expect(page).toContain('v-if="halloween" class="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true"');
    expect(page).toContain('v-if="seasonal"');
    expect(page).toContain("localizePath(seasonalUpdatePath(seasonalTheme.value))");
    expect(page).toContain("@media (prefers-reduced-motion: reduce)");
    expect(page).not.toMatch(/<img[^>]+(pumpkin|bat|moon)/i);
    const header = await read("../components/AppHeader.vue");
    expect(header).toContain("v-if=\"seasonalTheme === 'halloween'\"");
  });

  it("labels limited coin items in the shop and hides them outside their season", async () => {
    const page = await read("../pages/shop/index.vue");
    expect(page).toContain("isCoinCosmeticOnSale(item, seasonalNow.value)");
    expect(page).toContain("seasonalCopy(item.season.id, locale.value.code).limitedEdition");
    expect(page).toContain('v-if="item.limitedEdition"');
  });
});
