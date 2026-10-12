import { SEASONAL_THEMES, isWithinSeason, type SeasonalThemeId } from "#shared/seasonal-themes";

export type { SeasonalThemeId };

/**
 * The seasonal website skin active at `now`, or null outside every window.
 * Windows live in `shared/seasonal-themes.ts` (one row per season), so the
 * homepage skin, the shop's limited items and the API switch at the same time.
 */
export function activeSeasonalTheme(now: Date = new Date()): SeasonalThemeId | null {
  return SEASONAL_THEMES.find((theme) => isWithinSeason(theme, now))?.id ?? null;
}

/**
 * Release note announcing each season. A note is published once (in French),
 * under one slug, and every locale links to its localized `/updates/<slug>` route.
 */
export const SEASONAL_UPDATE_SLUGS = {
  halloween: "halloween-sur-cookie-build",
} as const satisfies Record<SeasonalThemeId, string>;

export function seasonalUpdatePath(theme: SeasonalThemeId): string {
  return `/updates/${SEASONAL_UPDATE_SLUGS[theme]}`;
}
