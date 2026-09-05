import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildMarketingSitemap } from "../utils/marketing-sitemap";

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

  it("publishes safety rules in English, French, Spanish, and Brazilian Portuguese", async () => {
    const rules = await source("../pages/rules.vue");

    expect(rules).toContain('id: "en", label: "English"');
    expect(rules).toContain('id: "fr", label: "Français"');
    expect(rules).toContain('id: "es", label: "Español"');
    expect(rules).toContain('id: "pt-BR", label: "Português (Brasil)"');
    expect(rules).toContain("/mute &lt;player&gt;");
    expect(rules).toContain("/block &lt;player&gt;");
    expect(rules).toContain("/report &lt;player&gt; &lt;reason&gt;");
    expect(rules).toContain("support@cookie-build.com");
  });

  it("keeps the status controls and language switch accessible", async () => {
    const status = await source("../pages/status.vue");
    const rules = await source("../pages/rules.vue");
    const missing = await source("../pages/[...slug].vue");

    expect(status).toContain('aria-live="polite"');
    expect(status).toContain('aria-labelledby="current-status"');
    expect(status).toContain('id: "es", label: "Español"');
    expect(status).toContain('id: "pt-BR", label: "Português (Brasil)"');
    expect(status).toContain('aria-label="Status language"');
    expect(status).toContain(':aria-pressed="selectedLanguage === language.id"');
    expect(rules).toContain(':aria-label="selectedCopy.languageLabel"');
    expect(rules).toContain(':aria-pressed="selectedLanguage === language.id"');
    expect(missing).toContain('robots: "noindex, nofollow"');
    expect(missing).toContain("setResponseStatus(event, 404)");
  });

  it("links the public trust pages from navigation and the sitemap", async () => {
    const header = await source("../components/AppHeader.vue");
    const footer = await source("../components/AppFooter.vue");
    const sitemap = buildMarketingSitemap();

    expect(header).toContain(':to="localizePath(\'/status\')"');
    expect(footer).toContain('to="/rules"');
    expect(footer).toContain('to="/support"');
    expect(sitemap).toContain("https://www.cookie-build.com/status");
    expect(sitemap).toContain("https://www.cookie-build.com/rules");
  });

  it("exposes the cosmetics inventory without technical preview claims", async () => {
    const [catalog, history, header] = await Promise.all([
      source("../pages/shop/index.vue"), source("../pages/shop/history.vue"), source("../components/AppHeader.vue"),
    ]);
    expect(header).toContain("localizePath('/shop')");
    expect(catalog).not.toContain("platformSupport.java.implementation");
    expect(catalog).toContain("Visible sur le site · aucun effet en jeu");
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
