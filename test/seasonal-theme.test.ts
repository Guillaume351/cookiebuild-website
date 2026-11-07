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
    expect(SEASONAL_THEMES.map((theme) => theme.id)).toEqual(["halloween", "christmas"]);
    expect(new Set(SEASONAL_THEMES.map((theme) => theme.id)).size).toBe(SEASONAL_THEMES.length);
    for (const theme of SEASONAL_THEMES) {
      expect(Date.parse(theme.availableUntil)).toBeGreaterThan(Date.parse(theme.availableFrom));
    }
    // Windows never overlap, so at most one skin (and one set of limited items) is active.
    for (let index = 1; index < SEASONAL_THEMES.length; index += 1) {
      expect(Date.parse(SEASONAL_THEMES[index]!.availableFrom))
        .toBeGreaterThanOrEqual(Date.parse(SEASONAL_THEMES[index - 1]!.availableUntil));
    }
  });

  it("runs Christmas from 1 December 00:00 to 5 January 00:00, Paris time", () => {
    const christmas = seasonWindow("christmas");
    expect(parisTime(new Date(christmas.availableFrom))).toBe("01/12/2026, 00:00");
    expect(parisTime(new Date(christmas.availableUntil))).toBe("05/01/2027, 00:00");
  });

  it("activates the skin inside the half-open window only", () => {
    expect(activeSeasonalTheme(new Date("2026-10-11T21:59:59.999Z"))).toBeNull();
    expect(activeSeasonalTheme(new Date("2026-10-11T22:00:00Z"))).toBe("halloween");
    // Across the 25 October daylight saving change.
    expect(activeSeasonalTheme(new Date("2026-10-25T12:00:00Z"))).toBe("halloween");
    expect(activeSeasonalTheme(new Date("2026-10-31T21:00:00+01:00"))).toBe("halloween");
    expect(activeSeasonalTheme(new Date("2026-11-02T22:59:59.999Z"))).toBe("halloween");
    expect(activeSeasonalTheme(new Date("2026-11-02T23:00:00Z"))).toBeNull();
    // Halloween is over: the release day (7 November) shows no skin.
    expect(activeSeasonalTheme(new Date("2026-11-07T12:00:00Z"))).toBeNull();
    expect(activeSeasonalTheme(new Date("2026-11-30T22:59:59.999Z"))).toBeNull();
    expect(activeSeasonalTheme(new Date("2026-11-30T23:00:00Z"))).toBe("christmas");
    expect(activeSeasonalTheme(new Date("2026-12-24T12:00:00Z"))).toBe("christmas");
    expect(activeSeasonalTheme(new Date("2027-01-04T22:59:59.999Z"))).toBe("christmas");
    expect(activeSeasonalTheme(new Date("2027-01-04T23:00:00Z"))).toBeNull();
    expect([null, "halloween", "christmas"]).toContain(activeSeasonalTheme());
  });

  it("recognises theme ids and windows without depending on the caller's clock", () => {
    expect(isSeasonalThemeId("halloween")).toBe(true);
    expect(isSeasonalThemeId("christmas")).toBe(true);
    expect(isSeasonalThemeId("easter")).toBe(false);
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
    expect(SEASONAL_COPY.christmas.fr.limitedEdition).toBe("Édition limitée Noël · jusqu’au 4 janvier");
    expect(SEASONAL_COPY.christmas.en.limitedEdition).toBe("Limited Christmas edition · until January 4");
    // French speaks to the player with "tu".
    for (const theme of SEASONAL_THEMES) {
      for (const text of Object.values(SEASONAL_COPY[theme.id].fr)) {
        expect(text).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b/i);
      }
    }
    // The advent calendar ends on 24 December, before the theme does.
    for (const { code } of SITE_LOCALES) expect(SEASONAL_COPY.christmas[code].bannerText).toContain("24");
  });

  it("names the last day of the window in the labels", () => {
    for (const theme of SEASONAL_THEMES) {
      const lastDay = new Date(Date.parse(theme.availableUntil) - 1);
      const day = (locale: string) => new Intl.DateTimeFormat(locale, { timeZone: "Europe/Paris", day: "numeric", month: "long" }).format(lastDay);
      const copy = SEASONAL_COPY[theme.id];
      expect(copy.fr.limitedEdition).toContain(day("fr"));
      expect(copy.en.limitedEdition).toContain(day("en-US"));
      expect(copy.it.limitedEdition).toContain(day("it"));
      expect(copy.es.limitedEdition).toContain(day("es"));
      expect(copy.fr.bannerEyebrow).toContain(day("fr"));
    }
    expect(SEASONAL_COPY.christmas.fr.bannerEyebrow).toContain("4 janvier");
  });

  it("links the banner to the localized release-note route", () => {
    expect(SEASONAL_UPDATE_SLUGS.halloween).toBe("halloween-sur-cookie-build");
    const path = seasonalUpdatePath("halloween");
    expect(path).toBe("/updates/halloween-sur-cookie-build");
    expect(supportsLocalizedSitePath(path)).toBe(true);
    expect(localizedSitePath(path, "fr")).toBe("/fr/updates/halloween-sur-cookie-build");
    expect(localizedSitePath(path, "en")).toBe("/updates/halloween-sur-cookie-build");
    expect(localizedSitePath(path, "pt-BR")).toBe("/pt-br/updates/halloween-sur-cookie-build");
    expect(SEASONAL_UPDATE_SLUGS.christmas).toBe("noel-sur-cookie-build");
    expect(localizedSitePath(seasonalUpdatePath("christmas"), "fr")).toBe("/fr/updates/noel-sur-cookie-build");
    expect(localizedSitePath(seasonalUpdatePath("christmas"), "de")).toBe("/de/updates/noel-sur-cookie-build");
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
    expect(header).toContain("v-if=\"seasonalTheme === 'christmas'\"");
  });

  it("adds a date-gated Christmas skin next to the Halloween one, CSS and inline SVG only", async () => {
    const page = await read("../pages/index.vue");
    expect(page).toContain('const christmas = computed(() => seasonalTheme.value === "christmas");');
    expect(page).toContain('v-if="christmas" class="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true"');
    // Each decoration is gated by its own season: the Halloween one stays off in December.
    expect(page).toContain('const halloween = computed(() => seasonalTheme.value === "halloween");');
    expect(page).not.toMatch(/<img[^>]+(snow|christmas|gift|tree)/i);
    expect(page).toMatch(/christmas: \{\s*hero: "christmas-hero/);
    expect(page).toContain(':class="seasonal.style.banner"');
    const reduced = page.slice(page.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain(".christmas-snow, .christmas-bulb, .christmas-flake { animation: none; }");
  });

  it("labels limited coin items in the shop and hides them outside their season", async () => {
    const page = await read("../pages/shop/index.vue");
    expect(page).toContain("isCoinCosmeticOnSale(item, seasonalNow.value)");
    expect(page).toContain("seasonalCopy(item.season.id, locale.value.code).limitedEdition");
    expect(page).toContain('v-if="item.limitedEdition"');
    // Each season has its own badge look (no pumpkin on a Christmas item).
    expect(page).toMatch(/christmas: \{\s*icon: "❄️"/);
    expect(page).toContain("LIMITED_EDITION_STYLE[item.season.id]");
  });
});
