import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { NodeTypes, parse, type RootNode, type TemplateChildNode } from "@vue/compiler-dom";
import { describe, expect, it } from "vitest";
import { LEGAL_COPY, legalTranslation } from "../utils/legal-copy";
import { SITE_LOCALES } from "../utils/site-locales";

function originalSectionsHash(source: string, language: string) {
  const sections: string[] = [];
  function walk(node: RootNode | TemplateChildNode) {
    if (node.type === NodeTypes.ELEMENT && node.tag === "section"
      && node.props.some((prop) => prop.type === NodeTypes.ATTRIBUTE
        && prop.name === "lang" && prop.value?.content === language)) {
      sections.push(node.loc.source.replace(/v-if="[^"]*"/g, ""));
      return;
    }
    if (node.type === NodeTypes.ROOT || node.type === NodeTypes.ELEMENT) {
      for (const child of node.children) walk(child);
    }
  }
  walk(parse(source));
  return createHash("sha256").update(sections.join("\n")).digest("hex");
}

describe("complete legal-page translations", () => {
  it("covers every non-original locale with all original clause groups and durations", () => {
    const extraLocales = SITE_LOCALES.filter((locale) => !["en", "fr"].includes(locale.code));
    expect(Object.keys(LEGAL_COPY).sort()).toEqual(extraLocales.map((locale) => locale.code).sort());
    expect(legalTranslation("en")).toBeUndefined();
    expect(legalTranslation("fr")).toBeUndefined();
    for (const locale of extraLocales) {
      const copy = legalTranslation(locale.code)!;
      expect(copy.privacy.sections).toHaveLength(8);
      expect(copy.terms.sections).toHaveLength(9);
      expect(copy.privacy.sections[1]?.items).toHaveLength(13);
      expect(copy.privacy.sections[2]?.items).toHaveLength(6);
      expect(copy.privacy.sections[4]?.items).toHaveLength(13);
      expect(copy.terms.sections[2]?.items).toHaveLength(5);
      expect(copy.terms.sections[6]?.items).toHaveLength(6);
      const privacy = JSON.stringify(copy.privacy);
      const terms = JSON.stringify(copy.terms);
      for (const preserved of ["Guillaume Claverie", "support@cookie-build.com", "Firebase", "Stripe", "CNIL", "UTC", "1.2.3", "10", "7", "30", "90", "12", "24", "180"]) {
        expect(privacy, `${locale.code}: ${preserved}`).toContain(preserved);
      }
      expect(copy.privacy.updated).toContain("2026");
      expect(copy.terms.updated).toContain("2026");
      expect(terms).toContain("{seller}");
      expect(terms).toContain("{support}");
      expect(terms).toContain("14");
      expect(copy.privacy.sections[5]?.link?.path).toBe("/account/delete");
      expect(copy.terms.sections[8]?.link?.path).toBe("/privacy");
      for (const document of [copy.privacy, copy.terms]) {
        expect(document.title.trim()).not.toBe("");
        for (const section of document.sections) {
          expect(section.title.trim()).not.toBe("");
          expect([...(section.paragraphs || []), ...(section.items || []), ...(section.after || [])]
            .every((text) => text.trim().length > 0)).toBe(true);
        }
      }
    }
  });

  it("preserves the existing English and French clauses and seller fields byte for byte", async () => {
    const expected = {
      privacy: {
        en: "f2fa119c2bcae031c8f47ed6ba2acecaf16e90525ed6195dd0f52bfde8a7ea42",
        fr: "cadd3191547c7e0a42d25bcf0ea6d08e265f2082d56481b8cbfbf6bddd313f19",
      },
      terms: {
        en: "d6b6ce90322d77b6b4a013cb3b9a52349fda704b6eb915ee81519ba10b5efcb8",
        fr: "b90c474e94a4255d2b6fd56f36ff7e62f2fa78d5c47df16d3b2507ccb7d69bda",
      },
    };
    for (const page of ["privacy", "terms"] as const) {
      const source = await readFile(new URL(`../pages/${page}.vue`, import.meta.url), "utf8");
      for (const language of ["en", "fr"] as const) {
        expect(originalSectionsHash(source, language)).toBe(expected[page][language]);
      }
      expect(source).not.toContain("LanguageFallbackNotice");
      expect(source).not.toContain("v-html");
      expect(source).toContain("legalTranslation(locale.value.code)");
      expect(source).toContain(":lang=\"locale.htmlLang\"");
    }
  });
});
