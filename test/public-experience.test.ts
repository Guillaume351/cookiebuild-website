import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildMarketingSitemap } from "../utils/marketing-sitemap";
import { SITE_LOCALES } from "../utils/site-locales";
import { SHOP_COPY } from "../utils/shop-copy";
import { SITE_COPY } from "../utils/site-copy";
import { RULES_COPY } from "../utils/rules-copy";
import { STATUS_COPY } from "../utils/status-copy";
import { SUPPORT_COPY } from "../utils/support-copy";
import { ANALYTICS_CONSENT_COPY } from "../utils/analytics-consent-copy";

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

describe("public experience", () => {
  it("reports zero players honestly without promising a ready match", async () => {
    const counter = await source("../components/PlayerCounter.vue");

    expect(counter).toContain("copy.status.onlineZero");
    expect(counter).toContain("copy.status.partial");
    expect(counter).toContain("Java: {{ editionLabel(status.java) }}");
    expect(counter).toContain("Bedrock: {{ editionLabel(status.bedrock) }}");
    expect(counter).not.toContain("Quick Play ready");
  });

  it("publishes complete safety rules in every header language", async () => {
    const rules = await source("../pages/rules.vue");

    for (const locale of SITE_LOCALES) {
      const text = RULES_COPY[locale.code];
      expect(text.lang).toBe(locale.code);
      expect(text.rules).toHaveLength(5);
      expect(text.rules.every((rule) => rule.title.length > 4 && rule.description.length > 20)).toBe(true);
      for (const key of ["summary", "safetyIntro", "mute", "block", "report", "moderation"] as const) {
        expect(text[key].length).toBeGreaterThan(20);
      }
    }
    expect(rules).toContain("RULES_COPY[locale.value.code]");
    expect(rules).not.toContain("selectedLanguage");
    expect(rules).toContain("/mute &lt;player&gt;");
    expect(rules).toContain("/block &lt;player&gt;");
    expect(rules).toContain("/report &lt;player&gt; &lt;reason&gt;");
    expect(rules).toContain("support@cookie-build.com");
  });

  it("keeps status controls accessible and uses only the shared language selector", async () => {
    const status = await source("../pages/status.vue");
    const rules = await source("../pages/rules.vue");
    const missing = await source("../pages/[...slug].vue");

    expect(status).toContain('aria-live="polite"');
    expect(status).toContain('aria-labelledby="current-status"');
    for (const locale of SITE_LOCALES) {
      const text = STATUS_COPY[locale.code];
      expect(text.title.length).toBeGreaterThan(5);
      expect(text.checkUnavailable).not.toBe(text.offline);
      expect(text.bothOnlineZero).toContain("0");
      expect(text.playersOnline(3)).toContain("3");
      expect(text.outageUnconfirmed.length).toBeGreaterThan(15);
    }
    expect(status).toContain("STATUS_COPY[locale.value.code]");
    expect(status).not.toContain("selectedLanguage");
    expect(rules).not.toContain("selectedLanguage");
    expect(missing).toContain("errorCopies[locale.value.code]");
    expect(missing).toContain('robots: "noindex, nofollow"');
    expect(missing).toContain("setResponseStatus(event, 404)");
  });

  it("links the public trust pages from navigation and the sitemap", async () => {
    const header = await source("../components/AppHeader.vue");
    const footer = await source("../components/AppFooter.vue");
    const sitemap = buildMarketingSitemap();

    expect(header).toContain(':to="localizePath(\'/status\')"');
    expect(footer).toContain(':to="localizePath(\'/rules\')"');
    expect(footer).toContain(':to="localizePath(\'/support\')"');
    expect(sitemap).toContain("https://www.cookie-build.com/status");
    expect(sitemap).toContain("https://www.cookie-build.com/rules");
  });

  it("localizes shared navigation, consent and support in all eight languages", async () => {
    for (const locale of SITE_LOCALES) {
      for (const value of Object.values(SITE_COPY[locale.code].navigation)) expect(value.trim()).not.toBe("");
      for (const value of Object.values(SUPPORT_COPY[locale.code])) expect(value.trim()).not.toBe("");
      for (const value of Object.values(ANALYTICS_CONSENT_COPY[locale.code])) expect(value.trim()).not.toBe("");
      expect(SUPPORT_COPY[locale.code].appInstructions).toContain("/app link");
      expect(SUPPORT_COPY[locale.code].webInstructions).toContain("/support link");
      expect(SITE_COPY[locale.code].footer.analyticsPreferences.trim()).not.toBe("");
    }
    const consent = await source("../components/AnalyticsConsent.vue");
    expect(consent).toContain("ANALYTICS_CONSENT_COPY[locale.value.code]");
    expect(consent).toContain("analytics.setConsent('denied')");
    expect(consent).toContain("analytics.setConsent('granted')");
  });

  it("exposes the cosmetics inventory without technical preview claims", async () => {
    const [catalog, history, header] = await Promise.all([
      source("../pages/shop/index.vue"), source("../pages/shop/history.vue"), source("../components/AppHeader.vue"),
    ]);
    expect(header).toContain("localizePath('/shop')");
    expect(catalog).not.toContain("platformSupport.java.implementation");
    expect(catalog).toContain("shop.webOnly");
    expect(SHOP_COPY.fr.webOnly).toBe("Visible sur le site · aucun effet en jeu");
    expect(history).toContain("/api/commerce/selections");
    expect(history).toContain("Télécharger mon historique");
  });

  it("describes commerce retention as individual request review", async () => {
    const privacy = await source("../pages/privacy.vue");
    expect(privacy).toContain("Requests are reviewed individually");
    expect(privacy).toContain("Son expiration ne supprime pas les transactions associées");
    expect(privacy).not.toContain("Data no longer required for those purposes is deleted or anonymised");
  });

  it("uses the cleaned lobby artwork for the responsive hero", async () => {
    const home = await source("../pages/index.vue");

    expect(home).toContain('/lobby-hero-clean-960.webp');
    expect(home).toContain('/lobby-hero-clean-1600.webp');
    expect(home).not.toContain('image: "https://www.cookie-build.com/lobby-hero-1600.webp"');
  });

  it("remembers the chosen edition and defaults mobile visitors to Bedrock", async () => {
    const home = await source("../pages/index.vue");

    expect(home).toContain('localStorage.getItem("cookiebuild-minecraft-edition")');
    expect(home).toContain('matchMedia("(max-width: 767px)")');
    expect(home).toContain('selectedEdition.value = "bedrock"');
    expect(home).toContain('localStorage.setItem("cookiebuild-minecraft-edition", edition)');
  });
});
