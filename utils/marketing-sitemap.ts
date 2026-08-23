import {
  LOCALIZED_MARKETING_PATHS,
  SITE_LOCALES,
  localizedAbsoluteUrl,
} from "./site-locales";

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

export function buildMarketingSitemap() {
  const localizedEntries = LOCALIZED_MARKETING_PATHS.flatMap((path) =>
    SITE_LOCALES.map((locale) => localizedUrlEntry(path, locale.code)),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...localizedEntries,
    "</urlset>",
    "",
  ].join("\n");
}
