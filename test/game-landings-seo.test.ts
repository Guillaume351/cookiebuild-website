import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { COOKIE_BUILD_BEDROCK_PORT, COOKIE_BUILD_SERVER_IP, gameLandings } from "../utils/game-landings";
import { buildMarketingSitemap } from "../utils/marketing-sitemap";

const readSource = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

describe("game mode SEO landing pages", () => {
  it("defines a unique, search-focused page for every live game", () => {
    expect(gameLandings.map((game) => game.slug)).toEqual([
      "bedwars",
      "skyblock",
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

  it("publishes the BedWars beta with its Cookie Colosseum artwork and rules", async () => {
    const bedWars = gameLandings.find((game) => game.slug === "bedwars");
    const [page, artwork, seo] = await Promise.all([
      readSource("../pages/bedwars.vue"),
      readFile(new URL("../public/bedwars-cookie-colosseum-beta.webp", import.meta.url)),
      readSource("../composables/useGameLandingSeo.ts"),
    ]);
    const sitemap = buildMarketingSitemap();

    expect(bedWars).toMatchObject({
      path: "/bedwars",
      badgeLabel: "Beta · Free to play",
      heroImage: "/bedwars-cookie-colosseum-beta.webp",
      heroImageCaption: "Cookie Colosseum beta preview — Red team's bakery base.",
      heroImageWidth: 1200,
      heroImageHeight: 675,
    });
    expect(bedWars?.heroIntro).toContain("Cookie Colosseum");
    expect(bedWars?.highlightBody).toContain("Bedrock forms");
    expect(artwork.byteLength).toBeGreaterThan(10_000);
    expect(page).toContain('localizedGameLandingBySlug(locale.value.code, "bedwars")');
    expect(page).toContain("useGameLandingSeo(game)");
    expect(seo).toContain("twitterImageAlt");
    expect(seo).toContain("ogImageHeight");
    expect(sitemap.match(/<loc>https:\/\/www\.cookie-build\.com\/bedwars<\/loc>/g)).toHaveLength(1);
  });

  it("publishes shared connection details and visible matching structured data", async () => {
    const [page, seo] = await Promise.all([
      readSource("../components/GameLandingPage.vue"),
      readSource("../composables/useGameLandingSeo.ts"),
    ]);

    expect(page).toContain("copy.gameUi.bedrockIp");
    expect(page).toContain("copy.gameUi.javaIp");
    expect(page).toContain('import Badge from "@/components/ui/badge/Badge.vue"');
    expect(page).toContain('import { Button } from "@/components/ui/button"');
    expect(page).toContain("game.heroIntro");
    expect(page).toContain("game.faqs");
    expect(seo).toContain('robots: "index, follow"');
    expect(seo).toContain('"@type": "BreadcrumbList"');
    expect(seo).toContain('"@type": "FAQPage"');
  });

  it("links every game from the homepage, catalog and sitemap", async () => {
    const [home, catalog, header, footer] = await Promise.all([
      readSource("../pages/index.vue"),
      readSource("../pages/games/index.vue"),
      readSource("../components/AppHeader.vue"),
      readSource("../components/AppFooter.vue"),
    ]);
    const sitemap = buildMarketingSitemap();

    expect(header).toContain(":to=\"localizePath('/games')\"");
    expect(footer).toContain(":to=\"localizePath('/games')\"");
    expect(catalog).toContain('v-for="game in localizedGames"');

    for (const game of gameLandings) {
      expect(home).toContain(`localizePath("${game.path}")`);
      expect(sitemap).toContain(`https://www.cookie-build.com${game.path}`);
    }
  });
});
