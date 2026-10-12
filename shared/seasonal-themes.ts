/**
 * Seasonal windows shared by the website, the shop API and the coin catalog.
 * Each window is half-open, [availableFrom, availableUntil), written with the
 * Europe/Paris offset of that date. It matches the game's `themes/<id>/theme.yml`
 * window and theme id. Christmas is one more row.
 */
export interface SeasonWindow {
  id: string;
  availableFrom: string;
  availableUntil: string;
}

export const SEASONAL_THEMES = [
  {
    id: "halloween",
    availableFrom: "2026-10-12T00:00:00+02:00",
    availableUntil: "2026-11-03T00:00:00+01:00",
  },
] as const satisfies ReadonlyArray<SeasonWindow>;

export type SeasonalThemeId = (typeof SEASONAL_THEMES)[number]["id"];

export function isSeasonalThemeId(value: string): value is SeasonalThemeId {
  return SEASONAL_THEMES.some((theme) => theme.id === value);
}

export function seasonWindow(id: SeasonalThemeId): (typeof SEASONAL_THEMES)[number] {
  return SEASONAL_THEMES.find((theme) => theme.id === id)!;
}

/** True while `now` is inside the window (start included, end excluded). */
export function isWithinSeason(
  season: Pick<SeasonWindow, "availableFrom" | "availableUntil">,
  now: Date = new Date(),
): boolean {
  const time = now.getTime();
  return time >= Date.parse(season.availableFrom) && time < Date.parse(season.availableUntil);
}
