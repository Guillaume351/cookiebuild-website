import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import net from "node:net";
import process from "node:process";

const origin = "https://www.cookie-build.com";
const localeContract = JSON.parse(await readFile(new URL("../contracts/locales-v1.json", import.meta.url), "utf8"));
const locales = localeContract.locales.map((locale) => ({
  code: locale.code,
  segment: locale.pathSegment,
  lang: locale.languageTag,
}));


const localize = (path, locale) => locale.segment
  ? path === "/" ? `/${locale.segment}` : `/${locale.segment}${path}`
  : path;

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const externalOrigin = process.env.COOKIEBUILD_SSR_BASE_URL;
const port = externalOrigin ? null : await getFreePort();
const localOrigin = externalOrigin || `http://127.0.0.1:${port}`;
const server = externalOrigin ? null : spawn(process.execPath, [".output/server/index.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(port),
    NUXT_DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused",
  },
  stdio: "ignore",
});

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${localOrigin}/sitemap.xml`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // The process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, "Nuxt server did not become ready");

  const sitemapResponse = await fetch(`${localOrigin}/sitemap.xml`);
  const sitemap = await sitemapResponse.text();
  assert(sitemapResponse.status === 200, "sitemap did not return 200");
  assert(sitemapResponse.headers.get("content-type")?.includes("application/xml"), "sitemap content type is not XML");
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert(sitemapUrls.length === new Set(sitemapUrls).size, "sitemap has duplicate URLs");
  const paths = sitemapUrls.map((url) => new URL(url).pathname).filter((path) =>
    !locales.some((locale) => locale.segment && (path === `/${locale.segment}` || path.startsWith(`/${locale.segment}/`))),
  );
  for (const required of ["/nomad-wars", "/fat-king", "/maps", "/maps/nomad-oasis", "/maps/fat-king-crown", "/updates/nomad-wars-preview", "/updates/fat-king-preview"]) {
    assert(paths.includes(required), `sitemap missing ${required}`);
  }
  let routeCount = 0;
  for (const path of [...paths, "/account/delete"]) {
    for (const locale of locales) {
      const route = localize(path, locale);
      const response = await fetch(`${localOrigin}${route}`);
      const html = await response.text();
      assert(response.status === 200, `${route}: expected 200, got ${response.status}`);
      assert(html.includes(`lang="${locale.lang}"`), `${route}: missing html lang ${locale.lang}`);
      assert(html.includes(`rel="canonical" href="${origin}${route}"`), `${route}: missing self canonical`);
      const sharingUrls = [...html.matchAll(/property="og:url" content="([^"]+)"/g)].map((match) => match[1]);
      assert(sharingUrls.length === 1 && sharingUrls[0] === `${origin}${route}`, `${route}: sharing URL points to the wrong page or is duplicated`);
      for (const alternate of locales) {
        const alternateRoute = localize(path, alternate);
        assert(
          html.includes(`hreflang="${alternate.lang}" href="${origin}${alternateRoute}"`),
          `${route}: missing ${alternate.lang} alternate`,
        );
      }
      assert(html.includes(`hreflang="x-default" href="${origin}${path}"`), `${route}: missing x-default`);
      assert(
        new RegExp(`<option value="${locale.code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" selected>`).test(html),
        `${route}: current language option is not selected in SSR`,
      );
      const jsonLdBodies = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .map((match) => match[1].trim())
        .filter(Boolean);
      if (["/", "/games", "/bedwars", "/skyblock", "/build-battle", "/microbattles", "/pitchout", "/skywars", "/turfwars"].includes(path)) {
        assert(jsonLdBodies.length > 0, `${route}: JSON-LD is empty`);
      }
      for (const body of jsonLdBodies) JSON.parse(body);
      routeCount += 1;
    }
  }

  const missing = await fetch(`${localOrigin}/bg/not-a-cookie-build-page`);
  assert(missing.status === 404, `localized catch-all expected 404, got ${missing.status}`);

  const localizedUrlCount = paths.length * locales.length;
  assert(sitemapUrls.length === localizedUrlCount, `sitemap must contain ${localizedUrlCount} public URLs`);
  for (const path of paths) for (const locale of locales) {
    assert(sitemapUrls.includes(origin + localize(path, locale)), `sitemap missing ${localize(path, locale)}`);
  }
  for (const locale of locales) {
    assert((sitemap.match(new RegExp(`hreflang="${locale.lang}"`, "g")) || []).length === localizedUrlCount, `sitemap ${locale.lang} alternate count mismatch`);
  }
  assert((sitemap.match(/hreflang="x-default"/g) || []).length === localizedUrlCount, "sitemap x-default count mismatch");
  const mobileAgents = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36",
  ];
  for (const ua of mobileAgents) for (const path of ["/fr/nomad-wars", "/fr/fat-king", "/pt-br/maps/nomad-oasis", "/de/updates/fat-king-preview"]) {
    const url = `${localOrigin}${path}?utm_source=friend`;
    const response = await fetch(url, { redirect: "manual", headers: { "user-agent": ua, "accept-language": "en-US,en;q=0.9", cookie: "i18n_redirected=en" } });
    const html = await response.text();
    assert(response.status === 200 && response.headers.get("location") === null, `${path}: mobile redirect`);
    assert(html.includes(`property="og:url" content="${origin}${path}"`), `${path}: mobile sharing URL`);
  }

  process.stdout.write(`Localized SSR verified: ${routeCount} routes, 1 localized 404, ${localizedUrlCount} sitemap URLs.\n`);
} finally {
  server?.kill("SIGTERM");
}
