import { COOKIE_BUILD_SITE_URL } from "./game-landings";

export type SiteLocaleCode = "en" | "bg" | "es" | "hi" | "pt-BR";

export interface SiteLocale {
  code: SiteLocaleCode;
  pathSegment: "" | "bg" | "es" | "hi" | "pt-br";
  htmlLang: "en-AU" | "bg-BG" | "es-PE" | "hi-IN" | "pt-BR";
  hreflang: "en-AU" | "bg-BG" | "es-PE" | "hi-IN" | "pt-BR";
  label: string;
  nativeLabel: string;
  country: string;
  flag: string;
}

export const SITE_LOCALES: readonly SiteLocale[] = [
  { code: "en", pathSegment: "", htmlLang: "en-AU", hreflang: "en-AU", label: "English", nativeLabel: "English", country: "Australia", flag: "🇦🇺" },
  { code: "bg", pathSegment: "bg", htmlLang: "bg-BG", hreflang: "bg-BG", label: "Bulgarian", nativeLabel: "Български", country: "Bulgaria", flag: "🇧🇬" },
  { code: "es", pathSegment: "es", htmlLang: "es-PE", hreflang: "es-PE", label: "Spanish", nativeLabel: "Español", country: "Peru", flag: "🇵🇪" },
  { code: "hi", pathSegment: "hi", htmlLang: "hi-IN", hreflang: "hi-IN", label: "Hindi", nativeLabel: "हिन्दी", country: "India", flag: "🇮🇳" },
  { code: "pt-BR", pathSegment: "pt-br", htmlLang: "pt-BR", hreflang: "pt-BR", label: "Brazilian Portuguese", nativeLabel: "Português (Brasil)", country: "Brazil", flag: "🇧🇷" },
] as const;

export const LOCALIZED_MARKETING_PATHS = [
  "/",
  "/games",
  "/bedwars",
  "/skyblock",
  "/build-battle",
  "/microbattles",
  "/pitchout",
  "/skywars",
  "/turfwars",
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
  if (!resolved.pathSegment) return basePath;
  return basePath === "/" ? `/${resolved.pathSegment}` : `/${resolved.pathSegment}${basePath}`;
}

export function localizedAbsoluteUrl(path: string, locale: SiteLocale | SiteLocaleCode): string {
  return `${COOKIE_BUILD_SITE_URL}${localizedSitePath(path, locale)}`;
}

export function localizedSeoLinks(path: string) {
  const canonicalPath = stripSiteLocale(path);
  return [
    ...SITE_LOCALES.map((locale) => ({
      rel: "alternate",
      hreflang: locale.hreflang,
      href: localizedAbsoluteUrl(canonicalPath, locale),
    })),
    {
      rel: "alternate",
      hreflang: "x-default",
      href: localizedAbsoluteUrl(canonicalPath, "en"),
    },
  ];
}
