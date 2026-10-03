import { BUILDBATTLE_THEME_NAMES } from "./buildbattle-themes";

/** Public API shapes of the Build Battle gallery (contract bb-gallery-20261003, section 3). */
export type BuildOutcome = "judged" | "solo" | "forfeit";
export type BuildSort = "top" | "recent";
export type BuildPeriod = "week" | "month" | "all";
export type BuildReportReason = "offensive" | "inappropriate" | "other";

export interface BuildSummary {
  id: string;
  shortCode: string;
  playerName: string | null;
  /** Localized theme name (falls back to the stored English name). */
  theme: string;
  themeKey: string;
  outcome: string;
  placement: number | null;
  builders: number;
  blockCount: number;
  size: [number, number, number];
  likeCount: number;
  createdAt: string;
  /** Absolute, localized build page URL. */
  url: string;
  /** Absolute 1200×630 PNG share card URL. */
  ogImageUrl: string;
}

export interface BuildDetail extends BuildSummary {
  liked: boolean;
}

/** Public origin used for absolute share URLs (same as utils/game-landings COOKIE_BUILD_SITE_URL). */
export const GALLERY_SITE_URL = "https://www.cookie-build.com";

export const BUILD_REPORT_REASONS = ["offensive", "inappropriate", "other"] as const satisfies readonly BuildReportReason[];
export const BUILD_SHORT_CODE_PATTERN = /^[0-9A-Za-z]{4,10}$/;

export const GALLERY_LOCALES = ["en", "fr", "de", "it", "bg", "es", "hi", "pt-BR"] as const;
export type GalleryLocale = (typeof GALLERY_LOCALES)[number];

const LOCALE_PATH_SEGMENT: Record<GalleryLocale, string> = {
  en: "",
  fr: "fr",
  de: "de",
  it: "it",
  bg: "bg",
  es: "es",
  hi: "hi",
  "pt-BR": "pt-br",
};

/** Accepts "fr", "fr-FR", "pt_BR", "pt", … and returns a site locale, or null. */
export function normalizeGalleryLocale(value: unknown): GalleryLocale | null {
  if (typeof value !== "string") return null;
  const tag = value.trim().slice(0, 16).replace(/_/g, "-").toLowerCase();
  if (!tag) return null;
  if (tag === "pt" || tag.startsWith("pt-")) return "pt-BR";
  const language = tag.split("-", 1)[0];
  return (GALLERY_LOCALES as readonly string[]).includes(language!) ? language as GalleryLocale : null;
}

/** Localized theme display name from the BuildBattles plugin bundles, else the stored fallback. */
export function localizedThemeName(themeKey: string, fallback: string, locale: GalleryLocale | null) {
  if (!locale) return fallback;
  const localized = BUILDBATTLE_THEME_NAMES[themeKey]?.[locale];
  return localized && localized.trim() ? localized : fallback;
}

/** Site path of the gallery listing: /builds, /fr/galerie, /de/builds, … */
export function galleryListPath(locale: GalleryLocale | null) {
  if (locale === "fr") return "/fr/galerie";
  const segment = locale ? LOCALE_PATH_SEGMENT[locale] : "";
  return segment ? `/${segment}/builds` : "/builds";
}

/** Site path of one build page: /builds/<code>, /fr/galerie/<code>, /de/builds/<code>, … */
export function buildPagePath(shortCode: string, locale: GalleryLocale | null) {
  return `${galleryListPath(locale)}/${encodeURIComponent(shortCode)}`;
}

export function buildPageUrl(shortCode: string, locale: GalleryLocale | null) {
  return `${GALLERY_SITE_URL}${buildPagePath(shortCode, locale)}`;
}

/** Share-card URL; `v` (the like count) makes each rendered variant immutable and cacheable. */
export function buildOgImageUrl(shortCode: string, likeCount: number, locale: GalleryLocale | null) {
  const query = new URLSearchParams({ v: String(likeCount) });
  if (locale) query.set("locale", locale);
  return `${GALLERY_SITE_URL}/api/builds/${encodeURIComponent(shortCode)}/og.png?${query}`;
}
