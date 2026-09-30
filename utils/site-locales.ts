import { COOKIE_BUILD_SITE_URL } from "./game-landings";
import localeContract from "../contracts/locales-v1.json";

export type SiteLocaleCode = "en" | "fr" | "de" | "it" | "bg" | "es" | "hi" | "pt-BR";

type SeoLanguage = "en" | "fr" | "de" | "it" | "bg" | "es" | "hi" | "pt-BR";

export interface SiteLocale {
  code: SiteLocaleCode;
  pathSegment: "" | "fr" | "de" | "it" | "bg" | "es" | "hi" | "pt-br";
  /**
   * Regional tag from the shared locale contract. The mobile app and the
   * bootstrap API use it for their own locale registry, so it stays regional.
   */
  languageTag: string;
  /**
   * Language-only tags used for `<html lang>`, hreflang and JSON-LD so that
   * each translation targets every speaker of that language (not one country).
   */
  htmlLang: SeoLanguage;
  hreflang: SeoLanguage;
  /** Open Graph expects a language_TERRITORY value. */
  ogLocale: string;
  label: string;
  nativeLabel: string;
  country: string;
  flag: string;
}

const SEO_LANGUAGE: Record<SiteLocaleCode, SeoLanguage> = {
  en: "en",
  fr: "fr",
  de: "de",
  it: "it",
  bg: "bg",
  es: "es",
  hi: "hi",
  "pt-BR": "pt-BR",
};

const OG_LOCALE: Record<SiteLocaleCode, string> = {
  en: "en_US",
  fr: "fr_FR",
  de: "de_DE",
  it: "it_IT",
  bg: "bg_BG",
  es: "es_ES",
  hi: "hi_IN",
  "pt-BR": "pt_BR",
};

export const SITE_LOCALES: readonly SiteLocale[] = localeContract.locales.map((locale) => {
  const code = locale.code as SiteLocaleCode;
  return {
    ...locale,
    code,
    pathSegment: locale.pathSegment as SiteLocale["pathSegment"],
    htmlLang: SEO_LANGUAGE[code],
    hreflang: SEO_LANGUAGE[code],
    ogLocale: OG_LOCALE[code],
  };
});

/**
 * Pages whose URL slug is translated. Keys are canonical (English) base paths;
 * every sub-path follows the translated prefix (e.g. /join/xbox -> /fr/rejoindre/xbox).
 */
export const LOCALIZED_SLUGS: Record<string, Partial<Record<SiteLocaleCode, string>>> = {
  "/join": { fr: "/rejoindre" },
  "/history": { fr: "/notre-histoire" },
};

function canonicalSlugPath(path: string, locale: SiteLocale | undefined): string {
  if (!locale) return path;
  for (const [canonical, slugs] of Object.entries(LOCALIZED_SLUGS)) {
    const translated = slugs[locale.code];
    if (translated && (path === translated || path.startsWith(`${translated}/`))) {
      return canonical + path.slice(translated.length);
    }
  }
  return path;
}

function translatedSlugPath(path: string, locale: SiteLocale): string {
  for (const [canonical, slugs] of Object.entries(LOCALIZED_SLUGS)) {
    const translated = slugs[locale.code];
    if (translated && (path === canonical || path.startsWith(`${canonical}/`))) {
      return translated + path.slice(canonical.length);
    }
  }
  return path;
}

export const LOCALIZED_MARKETING_PATHS = [
  "/",
  "/games",
  "/nomad-wars",
  "/fat-king",
  "/maps",
  "/bedwars",
  "/skyblock",
  "/build-battle",
  "/microbattles",
  "/pitchout",
  "/skywars",
  "/turfwars",
  "/updates",
  "/join",
  "/join/playstation",
  "/join/xbox",
  "/join/switch",
  "/join/mobile",
  "/join/java",
  "/history",
  "/player-stats",
  "/support",
  "/status",
  "/rules",
  "/shop",
  "/privacy",
  "/terms",
] as const;

export const LOCALIZED_FUNCTIONAL_PATHS = [
  ...LOCALIZED_MARKETING_PATHS,
  "/account/delete",
] as const;

const localeBySegment = new Map<string, SiteLocale>(
  SITE_LOCALES.filter((locale) => locale.pathSegment).map((locale) => [locale.pathSegment, locale]),
);

export function siteLocaleFromPath(path: string): SiteLocale {
  const segment = path.split(/[/?#]/).filter(Boolean)[0]?.toLowerCase();
  return (segment && localeBySegment.get(segment)) || SITE_LOCALES[0]!;
}

/** Returns the canonical (English, unprefixed) base path of any site URL. */
export function stripSiteLocale(path: string): string {
  const cleanPath = path.split(/[?#]/, 1)[0] || "/";
  const segment = cleanPath.split("/").filter(Boolean)[0]?.toLowerCase();
  if (!segment || !localeBySegment.has(segment)) return cleanPath || "/";
  const stripped = cleanPath.slice(segment.length + 1);
  return canonicalSlugPath(stripped || "/", localeBySegment.get(segment));
}

export function localizedSitePath(path: string, locale: SiteLocale | SiteLocaleCode): string {
  const resolved = typeof locale === "string"
    ? SITE_LOCALES.find((candidate) => candidate.code === locale) || SITE_LOCALES[0]!
    : locale;
  const basePath = translatedSlugPath(stripSiteLocale(path), resolved);
  const suffix = path.match(/[?#].*$/)?.[0] || "";
  if (!resolved.pathSegment) return basePath + suffix;
  return (basePath === "/" ? `/${resolved.pathSegment}` : `/${resolved.pathSegment}${basePath}`) + suffix;
}

export function localizedAbsoluteUrl(path: string, locale: SiteLocale | SiteLocaleCode): string {
  return `${COOKIE_BUILD_SITE_URL}${localizedSitePath(stripSiteLocale(path), locale)}`;
}

export function supportsLocalizedSitePath(path: string) {
  const basePath = stripSiteLocale(path).replace(/\/+$/, "") || "/";
  return LOCALIZED_FUNCTIONAL_PATHS.includes(
    basePath as (typeof LOCALIZED_FUNCTIONAL_PATHS)[number],
  ) || basePath.startsWith("/updates/") || basePath.startsWith("/maps/");
}

export function switchSiteLocalePath(path: string, locale: SiteLocaleCode): string {
  // An untranslated utility page must never turn into the homepage.
  return supportsLocalizedSitePath(path) ? localizedSitePath(path, locale) : path;
}

export function localizedSeoLinks(path: string) {
  const canonicalPath = stripSiteLocale(path);
  return [
    ...SITE_LOCALES.map((locale) => ({
      rel: "alternate" as const,
      hreflang: locale.hreflang,
      href: localizedAbsoluteUrl(canonicalPath, locale),
    })),
    {
      rel: "alternate" as const,
      hreflang: "x-default",
      href: localizedAbsoluteUrl(canonicalPath, "en"),
    },
  ];
}
