import translations from "./locales/updates.json";
import type { SiteLocaleCode } from "./site-locales";

export const updatesCopy = translations satisfies Record<SiteLocaleCode, typeof translations.en>;
