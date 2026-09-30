import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { SITE_COPY } from "@/utils/site-copy";
import {
  SITE_LOCALES,
  localizedAbsoluteUrl,
  localizedSeoLinks,
  siteLocaleFromPath,
  stripSiteLocale,
  supportsLocalizedSitePath,
  switchSiteLocalePath,
} from "@/utils/site-locales";

export function useSiteLocale() {
  const route = useRoute();
  const locale = computed(() => siteLocaleFromPath(route.path));
  const copy = computed(() => SITE_COPY[locale.value.code]);
  const basePath = computed(() => stripSiteLocale(route.path));
  const supportsLocalizedRoute = computed(() => supportsLocalizedSitePath(basePath.value));

  const localizePath = (path: string) => switchSiteLocalePath(path, locale.value.code);
  const switchLocalePath = (code: (typeof SITE_LOCALES)[number]["code"]) => {
    return switchSiteLocalePath(route.fullPath, code);
  };

  return {
    locale,
    copy,
    basePath,
    localizePath,
    switchLocalePath,
    supportsLocalizedRoute,
  };
}

export interface LocalizedSeoOptions {
  /** Query string (without "?") kept in the canonical URL, e.g. "page=2". */
  canonicalQuery?: MaybeRefOrGetter<string | undefined>;
  /**
   * Canonical URL override. Pages whose main content is not translated point
   * every locale to one canonical URL and then omit hreflang alternates.
   */
  canonicalUrl?: MaybeRefOrGetter<string | undefined>;
  ogType?: "website" | "article";
  ogImage?: MaybeRefOrGetter<string | undefined>;
  robots?: MaybeRefOrGetter<string | undefined>;
  /** Set false for single-language content that has no translated alternates. */
  alternates?: boolean;
}

export function useLocalizedSeo(
  path: MaybeRefOrGetter<string>,
  title: MaybeRefOrGetter<string>,
  description: MaybeRefOrGetter<string>,
  options: LocalizedSeoOptions = {},
) {
  const route = useRoute();
  const locale = computed(() => siteLocaleFromPath(route.path));
  const selfUrl = computed(() => localizedAbsoluteUrl(toValue(path), locale.value));
  const canonicalUrl = computed(() => {
    const override = toValue(options.canonicalUrl);
    if (override) return override;
    const query = toValue(options.canonicalQuery);
    return query ? `${selfUrl.value}?${query}` : selfUrl.value;
  });
  const emitAlternates = computed(() => options.alternates !== false
    && (!toValue(options.canonicalUrl) || toValue(options.canonicalUrl) === selfUrl.value));
  const socialImage = computed(() => toValue(options.ogImage) || "https://www.cookie-build.com/cookie-build-social.webp");

  useSeoMeta({
    title: computed(() => toValue(title)),
    description: computed(() => toValue(description)),
    robots: computed(() => toValue(options.robots) || "index, follow"),
    ogTitle: computed(() => toValue(title)),
    ogDescription: computed(() => toValue(description)),
    ogType: options.ogType ?? "website",
    ogUrl: canonicalUrl,
    ogLocale: computed(() => locale.value.ogLocale),
    ogSiteName: "Cookie Build",
    ogImage: socialImage,
    ogImageAlt: computed(() => SITE_COPY[locale.value.code].common.socialImageAlt),
    twitterCard: "summary_large_image",
    twitterTitle: computed(() => toValue(title)),
    twitterDescription: computed(() => toValue(description)),
    twitterImage: socialImage,
    twitterImageAlt: computed(() => SITE_COPY[locale.value.code].common.socialImageAlt),
  });

  useHead(() => ({
    htmlAttrs: { lang: locale.value.htmlLang },
    link: [
      { rel: "canonical", href: canonicalUrl.value },
      ...(emitAlternates.value && !toValue(options.canonicalQuery) ? localizedSeoLinks(toValue(path)) : []),
    ],
  }));

  return { locale, canonicalUrl };
}
