import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { COOKIE_BUILD_BEDROCK_PORT, COOKIE_BUILD_SERVER_IP, gameLandings } from "../utils/game-landings";

const readSource = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

describe("game mode SEO landing pages", () => {
  it("defines a unique, search-focused page for every live game", () => {
    expect(gameLandings.map((game) => game.slug)).toEqual([
      "build-battle",
      "microbattles",
      "pitchout",
      "skywars",
      "turfwars",
    ]);

    expect(new Set(gameLandings.map((game) => game.path)).size).toBe(gameLandings.length);
    expect(new Set(gameLandings.map((game) => game.seoTitle)).size).toBe(gameLandings.length);

    for (const game of gameLandings) {
      expect(game.seoTitle).toContain("Minecraft Bedrock Server");
      expect(game.seoTitle.length).toBeLessThanOrEqual(60);
      expect(game.metaDescription).toContain(COOKIE_BUILD_SERVER_IP);
      expect(game.metaDescription).toContain(COOKIE_BUILD_BEDROCK_PORT);
      expect(game.metaDescription.length).toBeLessThanOrEqual(160);
      expect(game.steps).toHaveLength(3);
      expect(game.faqs.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("publishes shared connection details and visible matching structured data", async () => {
    const [page, seo] = await Promise.all([
      readSource("../components/GameLandingPage.vue"),
      readSource("../composables/useGameLandingSeo.ts"),
    ]);

    expect(page).toContain("Bedrock IP:");
    expect(page).toContain("Java IP:");
    expect(page).toContain("game.heroIntro");
    expect(page).toContain("game.faqs");
    expect(seo).toContain('robots: "index, follow"');
    expect(seo).toContain('"@type": "BreadcrumbList"');
    expect(seo).toContain('"@type": "FAQPage"');
  });

  it("links every game from the homepage, catalog and sitemap", async () => {
    const [home, catalog, header, footer, sitemap] = await Promise.all([
      readSource("../pages/index.vue"),
      readSource("../pages/games/index.vue"),
      readSource("../components/AppHeader.vue"),
      readSource("../components/AppFooter.vue"),
      readSource("../public/sitemap.xml"),
    ]);

    expect(header).toContain('to="/games"');
    expect(footer).toContain('to="/games"');
    expect(catalog).toContain('v-for="game in gameLandings"');

    for (const game of gameLandings) {
      expect(home).toContain(`href: "${game.path}"`);
      expect(sitemap).toContain(`https://www.cookie-build.com${game.path}`);
    }
  });
});
