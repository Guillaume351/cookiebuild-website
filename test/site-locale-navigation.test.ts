import { describe, expect, it } from "vitest";
import { SITE_LOCALES, localizedAbsoluteUrl, localizedSitePath, switchSiteLocalePath } from "../utils/site-locales";

describe("language navigation on shared links", () => {
  it.each(["/nomad-wars", "/nomad-wars/", "/fat-king", "/maps", "/maps/fat-king-crown", "/updates/nomad-wars-preview"])(
    "keeps the destination, query and anchor for %s in all languages", (path) => {
      for (const source of SITE_LOCALES) {
        const shared = localizedSitePath(path, source) + "?utm_source=friend&view=tiny#rules";
        for (const target of SITE_LOCALES) {
          expect(switchSiteLocalePath(shared, target.code)).toBe(
            localizedSitePath(path, target) + "?utm_source=friend&view=tiny#rules",
          );
        }
      }
    },
  );

  it("does not send unknown or untranslated utility pages to the homepage", () => {
    expect(switchSiteLocalePath("/shop/success?session_id=example", "fr")).toBe("/shop/success?session_id=example");
    expect(switchSiteLocalePath("/missing?source=share#content", "de")).toBe("/missing?source=share#content");
  });

  it("keeps canonical SEO URLs free of tracking parameters and anchors", () => {
    expect(localizedAbsoluteUrl("/fr/nomad-wars?utm_source=friend#rules", "de"))
      .toBe("https://www.cookie-build.com/de/nomad-wars");
  });
});
