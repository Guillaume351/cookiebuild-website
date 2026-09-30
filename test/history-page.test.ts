import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { HISTORY_COPY, HISTORY_MILESTONES, HISTORY_PEAK_PLAYERS } from "../utils/history-copy";
import { SITE_LOCALES, localizedSitePath } from "../utils/site-locales";

const readSource = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

/** Flattens every string of a copy object, calling copy functions with a sample value. */
function collectStrings(value: unknown, sample = "2,000", path = ""): Array<[string, string]> {
  if (typeof value === "string") return [[path, value]];
  if (typeof value === "function") return [[path, String(value(sample))]];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => collectStrings(child, sample, path ? `${path}.${key}` : key));
  }
  return [[path, ""]];
}

describe("history page copy", () => {
  it("provides non-empty copy with the same keys for every site locale", () => {
    const englishKeys = collectStrings(HISTORY_COPY.en).map(([key]) => key);
    expect(Object.keys(HISTORY_COPY).sort()).toEqual(SITE_LOCALES.map((locale) => locale.code).sort());

    for (const locale of SITE_LOCALES) {
      const entries = collectStrings(HISTORY_COPY[locale.code]);
      expect(entries.map(([key]) => key), locale.code).toEqual(englishKeys);
      for (const [key, text] of entries) {
        expect(text.trim(), `${locale.code}.${key}`).not.toBe("");
      }
    }
  });

  it("injects the locale-formatted peak player count instead of hard-coding it", () => {
    for (const locale of SITE_LOCALES) {
      const copy = HISTORY_COPY[locale.code];
      const formatted = new Intl.NumberFormat(locale.htmlLang).format(HISTORY_PEAK_PLAYERS);
      expect(copy.milestones.peak.title(formatted)).toContain(formatted);
      expect(copy.metaDescription(formatted)).toContain(formatted);
      expect(copy.metaDescription(formatted).length, locale.code).toBeLessThanOrEqual(160);
      const withoutCount = collectStrings(copy, "{players}").map(([, text]) => text).join("\n");
      expect(withoutCount, locale.code).not.toMatch(/2[,.\s\u202f\u00a0]?000/u);
    }
  });

  it("addresses French readers with tu", () => {
    const french = collectStrings(HISTORY_COPY.fr).map(([, text]) => text).join("\n");
    expect(french).not.toMatch(/(^|[^\p{L}])(vous|votre|vos|vôtre|vôtres)(?![\p{L}])/iu);
  });

  it("only dates milestones that published content dates", () => {
    expect(HISTORY_MILESTONES.map((milestone) => milestone.datetime ?? null)).toEqual([
      "2014",
      null,
      "2025",
      "2026-07",
      "2026-08",
      "2026-09",
      null,
    ]);
  });

  it("uses the translated French slug", () => {
    expect(localizedSitePath("/history", "fr")).toBe("/fr/notre-histoire");
    expect(localizedSitePath("/history", "pt-BR")).toBe("/pt-br/history");
  });
});

describe("history page source", () => {
  it("declares every localized alias, AboutPage JSON-LD and crawlable social links", async () => {
    const source = await readSource("../pages/history.vue");
    expect(source).toContain(
      'definePageMeta({ alias: ["/fr/notre-histoire", "/de/history", "/it/history", "/bg/history", "/es/history", "/hi/history", "/pt-br/history"] });',
    );
    for (const locale of SITE_LOCALES.filter((candidate) => candidate.code !== "en")) {
      expect(source).toContain(`"${localizedSitePath("/history", locale.code)}"`);
    }
    expect(source).toContain('"@type": "AboutPage"');
    expect(source).toContain('"@type": "BreadcrumbList"');
    expect(source).toContain("innerHTML: JSON.stringify(");
    expect(source).toContain('useLocalizedSeo("/history"');
    expect(source).toContain('href="https://discord.gg/ajmPnwh9g8"');
    expect(source).toContain('href="https://x.com/CookieBuild"');
    expect(source).toMatch(/rel="noopener noreferrer"/);
    for (const path of ["/games", "/skyblock", "/bedwars", "/fat-king", "/nomad-wars", "/join"]) {
      expect(source).toContain(`localizePath("${path}")`);
    }
  });
});
