import { describe, expect, it } from "vitest";
import { SITE_LOCALES } from "../utils/site-locales";
import { nomadPreviewCopy } from "../utils/nomad-preview";
import { fatKingPreviewCopy } from "../utils/fat-king-preview";
import { gameUiCopy } from "../utils/game-ui-copy";
import { mapCopy, localizedMap } from "../utils/map-catalog-localized";
import { mapCatalog } from "../utils/map-catalog";
import { updatesCopy } from "../utils/updates-copy";

function assertTranslatedShape(reference: unknown, actual: unknown, path: string) {
  if (typeof reference === "string") {
    expect(typeof actual, path).toBe("string");
    expect((actual as string).trim().length, path).toBeGreaterThan(0);
  } else if (Array.isArray(reference)) {
    expect(Array.isArray(actual), path).toBe(true);
    expect((actual as unknown[]).length, path).toBe(reference.length);
    reference.forEach((value, index) => assertTranslatedShape(value, (actual as unknown[])[index], `${path}.${index}`));
  } else if (reference && typeof reference === "object") {
    expect(Object.keys(actual as object).sort(), path).toEqual(Object.keys(reference).sort());
    for (const [key, value] of Object.entries(reference)) {
      assertTranslatedShape(value, (actual as Record<string, unknown>)[key], `${path}.${key}`);
    }
  }
}

describe("localized minigames and world catalogue", () => {
  for (const locale of SITE_LOCALES) {
    it(`provides complete game rules, viewer and update UI for ${locale.code}`, () => {
      for (const copy of [nomadPreviewCopy, fatKingPreviewCopy, gameUiCopy, mapCopy, updatesCopy]) {
        assertTranslatedShape(copy.en, copy[locale.code], locale.code);
      }
      expect(nomadPreviewCopy[locale.code].status).toContain("/nomadwars play");
      expect(fatKingPreviewCopy[locale.code].status).toContain("/fatking play");
      expect(fatKingPreviewCopy[locale.code].steps[0]?.text).toContain("/fatking crown");
      expect(fatKingPreviewCopy[locale.code].steps[1]?.text).toContain("/fatking give");
      if (locale.code !== "en") {
        expect(nomadPreviewCopy[locale.code].intro).not.toBe(nomadPreviewCopy.en.intro);
        expect(fatKingPreviewCopy[locale.code].intro).not.toBe(fatKingPreviewCopy.en.intro);
        expect(mapCopy[locale.code].intro).not.toBe(mapCopy.en.intro);
        expect(updatesCopy[locale.code].title).not.toBe(updatesCopy.en.title);
      }
    });
    it(`localizes all map descriptions without changing world identities for ${locale.code}`, () => {
      for (const map of mapCatalog) {
        const translated = localizedMap(map, locale.code);
        expect(translated.name).toBe(map.name);
        expect(translated.slug).toBe(map.slug);
        expect(translated.viewerId).toBe(map.viewerId);
        expect(translated.image).toBe(map.image);
        expect(translated.description).not.toMatch(/\{(?:name|game)\}/);
        expect(translated.districts).toHaveLength(map.districts.length);
        if (locale.code !== "en") expect(translated.description).not.toBe(map.description);
        for (const district of translated.districts) {
          expect(district.name.length).toBeGreaterThan(0);
          expect(district.role.length).toBeGreaterThan(0);
        }
      }
    });
  }
});
