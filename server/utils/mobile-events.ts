const LANGUAGE_PATTERN = /^[a-z]{2,3}$/;

function languageOf(value: string) {
  const language = value.trim().toLowerCase().replace(/_/g, "-").split("-", 1)[0] ?? "";
  return LANGUAGE_PATTERN.test(language) ? language : null;
}

/** Explicit ?locale= wins; otherwise the first Accept-Language entry; otherwise null (base copy). */
export function requestedEventLanguage(locale: unknown, acceptLanguage: string | undefined) {
  if (typeof locale === "string" && locale.trim()) return languageOf(locale.slice(0, 16));
  const first = acceptLanguage?.split(",", 1)[0]?.split(";", 1)[0];
  return first ? languageOf(first.slice(0, 16)) : null;
}

export type EventLocalizations = Record<string, { title?: unknown; description?: unknown }> | null | undefined;

/** Localized title/description with the stored base copy as fallback for each field. */
export function localizedEventCopy(
  base: { title: string; description: string },
  localizations: EventLocalizations,
  language: string | null,
) {
  const localized = language && localizations && typeof localizations === "object"
    ? localizations[language]
    : undefined;
  const title = typeof localized?.title === "string" && localized.title.trim() ? localized.title : base.title;
  const description = typeof localized?.description === "string" && localized.description.trim()
    ? localized.description
    : base.description;
  return { title, description };
}
