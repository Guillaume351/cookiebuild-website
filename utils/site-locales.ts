import { COOKIE_BUILD_SITE_URL } from "./game-landings";
import localeContract from "../contracts/locales-v1.json";

export type SiteLocaleCode = "en" | "fr" | "de" | "it" | "bg" | "es" | "hi" | "pt-BR";

export interface SiteLocale {
  code: SiteLocaleCode;
  pathSegment: "" | "fr" | "de" | "it" | "bg" | "es" | "hi" | "pt-br";
  htmlLang: "en-AU" | "fr-FR" | "de-DE" | "it-IT" | "bg-BG" | "es-PE" | "hi-IN" | "pt-BR";
  hreflang: "en-AU" | "fr-FR" | "de-DE" | "it-IT" | "bg-BG" | "es-PE" | "hi-IN" | "pt-BR";
  label: string;
  nativeLabel: string;
  country: string;
  flag: string;
}

export const SITE_LOCALES: readonly SiteLocale[] = localeContract.locales.map((locale) => ({
  ...locale,
  code: locale.code as SiteLocaleCode,
  pathSegment: locale.pathSegment as SiteLocale["pathSegment"],
  htmlLang: locale.languageTag as SiteLocale["htmlLang"],
  hreflang: locale.languageTag as SiteLocale["hreflang"],
}));

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

export function stripSiteLocale(path: string): string {
  const cleanPath = path.split(/[?#]/, 1)[0] || "/";
  const segment = cleanPath.split("/").filter(Boolean)[0]?.toLowerCase();
  if (!segment || !localeBySegment.has(segment)) return cleanPath || "/";
  const stripped = cleanPath.slice(segment.length + 1);
  return stripped || "/";
}

export function localizedSitePath(path: string, locale: SiteLocale | SiteLocaleCode): string {
  const resolved = typeof locale === "string"
    ? SITE_LOCALES.find((candidate) => candidate.code === locale) || SITE_LOCALES[0]!
    : locale;
  const basePath = stripSiteLocale(path);
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
