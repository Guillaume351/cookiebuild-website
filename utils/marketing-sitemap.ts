import { fetchAllNews } from "./all-news";
import { mapCatalog } from "./map-catalog";
import { updateLanguage } from "./updates";

import {
  LOCALIZED_MARKETING_PATHS,
  SITE_LOCALES,
  localizedAbsoluteUrl,
  localizedSitePath,
} from "./site-locales";

const mapAndArticlePaths = [
  "/updates/fat-king-preview",
  "/updates/nomad-wars-preview",
  ...mapCatalog.map((map) => `/maps/${map.slug}`),
];

export const MAP_PREVIEW_PATHS = mapAndArticlePaths.flatMap((path) =>
  SITE_LOCALES.map((locale) => localizedSitePath(path, locale)),
);

const escapeXml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

function localizedUrlEntry(path: string, localeCode: (typeof SITE_LOCALES)[number]["code"]) {
  const loc = localizedAbsoluteUrl(path, localeCode);
  const alternates = SITE_LOCALES.map((locale) =>
    `    <xhtml:link rel="alternate" hreflang="${locale.hreflang}" href="${escapeXml(localizedAbsoluteUrl(path, locale))}" />`,
  );
  alternates.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(localizedAbsoluteUrl(path, "en"))}" />`);
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    ...alternates,
    `    <changefreq>${path === "/" ? "weekly" : "monthly"}</changefreq>`,
    `    <priority>${path === "/" ? "1.0" : "0.9"}</priority>`,
    "  </url>",
  ].join("\n");
}

export interface SitemapArticle {
  slug: string;
  publishedAt: string | Date | null;
  title?: string;
  summary?: string;
}

const articleSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function lastmod(value: string | Date | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Update articles are published once, in a single language, so only their
 * canonical permalink (in the article's language) is listed; the other
 * locale-prefixed variants declare it as canonical.
 */
function articleUrlEntry(article: SitemapArticle) {
  const modified = lastmod(article.publishedAt);
  const language = updateLanguage({ title: article.title ?? "", summary: article.summary ?? "" });
  return [
    "  <url>",
    `    <loc>${escapeXml(localizedAbsoluteUrl(`/updates/${article.slug}`, language))}</loc>`,
    ...(modified ? [`    <lastmod>${modified}</lastmod>`] : []),
    "    <changefreq>yearly</changefreq>",
    "    <priority>0.6</priority>",
    "  </url>",
  ].join("\n");
}

export function renderMarketingSitemap(articles: readonly SitemapArticle[] = []) {
  const localizedEntries = [...new Set([...LOCALIZED_MARKETING_PATHS, ...mapAndArticlePaths])].flatMap((path) =>
    SITE_LOCALES.map((locale) => localizedUrlEntry(path, locale.code)),
  );
  const staticArticles = new Set(mapAndArticlePaths);
  const seen = new Set<string>();
  const articleEntries = articles
    .filter((article) => articleSlugPattern.test(article.slug))
    .filter((article) => !staticArticles.has(`/updates/${article.slug}`))
    .filter((article) => !seen.has(article.slug) && Boolean(seen.add(article.slug)))
    .map(articleUrlEntry);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...localizedEntries,
    ...articleEntries,
    "</urlset>",
    "",
  ].join("\n");
}

/** Loads every published update permalink through the public news API. */
export async function loadSitemapArticles(): Promise<SitemapArticle[]> {
  try {
    const articles = await fetchAllNews<SitemapArticle>();
    return articles.map(({ slug, publishedAt, title, summary }) => ({ slug, publishedAt, title, summary }));
  } catch (error) {
    console.error("[sitemap] update articles unavailable", error);
    return [];
  }
}

export async function buildMarketingSitemap() {
  return renderMarketingSitemap(await loadSitemapArticles());
}
