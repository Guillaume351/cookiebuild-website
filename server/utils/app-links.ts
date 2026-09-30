import localeContract from "../../contracts/locales-v1.json";

export const APP_STORE_URL = "https://apps.apple.com/app/id1223020091";
export const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=cookiebuild.com.cookiebuildstatus";

const localeSegments = new Map(
  localeContract.locales.map((locale) => [locale.code.toLowerCase(), locale.pathSegment]),
);

function homepageDownloadSection(acceptLanguage: string | undefined) {
  for (const entry of (acceptLanguage ?? "").split(",").slice(0, 8)) {
    const tag = entry.split(";", 1)[0]?.trim().toLowerCase();
    if (!tag) continue;
    const segment = localeSegments.get(tag) ?? localeSegments.get(tag.split("-", 1)[0]!);
    if (segment !== undefined) return segment ? `/${segment}#mobile-app` : "/#mobile-app";
  }
  return "/#mobile-app";
}

/**
 * Universal/App Links open /app/* directly in the installed app. Browsers that
 * reach this route do not have the app: send phones to their store listing and
 * everyone else to the homepage download section.
 */
export function appLinkFallback(userAgent: string | undefined, acceptLanguage: string | undefined) {
  const agent = userAgent ?? "";
  if (/\b(iPhone|iPad|iPod)\b/i.test(agent)) return APP_STORE_URL;
  if (/\bAndroid\b/i.test(agent)) return GOOGLE_PLAY_URL;
  return homepageDownloadSection(acceptLanguage);
}
