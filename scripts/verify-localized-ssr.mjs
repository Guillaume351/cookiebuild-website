import { spawn } from "node:child_process";
import net from "node:net";
import process from "node:process";

const origin = "https://www.cookie-build.com";
const locales = [
  { code: "en", segment: "", lang: "en-AU" },
  { code: "fr", segment: "fr", lang: "fr-FR" },
  { code: "de", segment: "de", lang: "de-DE" },
  { code: "it", segment: "it", lang: "it-IT" },
  { code: "bg", segment: "bg", lang: "bg-BG" },
  { code: "es", segment: "es", lang: "es-PE" },
  { code: "hi", segment: "hi", lang: "hi-IN" },
  { code: "pt-BR", segment: "pt-br", lang: "pt-BR" },
];
const paths = ["/", "/games", "/bedwars", "/skyblock", "/build-battle", "/microbattles", "/pitchout", "/skywars", "/turfwars"];

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

const port = await getFreePort();
const localOrigin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [".output/server/index.mjs"], {
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

  let routeCount = 0;
  for (const path of paths) {
    for (const locale of locales) {
      const route = localize(path, locale);
      const response = await fetch(`${localOrigin}${route}`);
      const html = await response.text();
      assert(response.status === 200, `${route}: expected 200, got ${response.status}`);
      assert(html.includes(`lang="${locale.lang}"`), `${route}: missing html lang ${locale.lang}`);
      assert(html.includes(`rel="canonical" href="${origin}${route}"`), `${route}: missing self canonical`);
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
      assert(jsonLdBodies.length > 0, `${route}: JSON-LD is empty`);
      for (const body of jsonLdBodies) JSON.parse(body);
      routeCount += 1;
    }
  }

  const missing = await fetch(`${localOrigin}/bg/not-a-cookie-build-page`);
  assert(missing.status === 404, `localized catch-all expected 404, got ${missing.status}`);

  const sitemapResponse = await fetch(`${localOrigin}/sitemap.xml`);
  const sitemap = await sitemapResponse.text();
  assert(sitemapResponse.status === 200, "sitemap did not return 200");
  assert(sitemapResponse.headers.get("content-type")?.includes("application/xml"), "sitemap content type is not XML");
  const localizedUrlCount = paths.length * locales.length;
  assert((sitemap.match(/<loc>/g) || []).length === localizedUrlCount + 7, `sitemap must contain ${localizedUrlCount + 7} public URLs`);
  for (const locale of locales) {
    assert((sitemap.match(new RegExp(`hreflang="${locale.lang}"`, "g")) || []).length === localizedUrlCount, `sitemap ${locale.lang} alternate count mismatch`);
  }
  assert((sitemap.match(/hreflang="x-default"/g) || []).length === localizedUrlCount, "sitemap x-default count mismatch");

  process.stdout.write(`Localized SSR verified: ${routeCount} routes, 1 localized 404, ${localizedUrlCount + 7} sitemap URLs.\n`);
} finally {
  server.kill("SIGTERM");
}
