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

export function useLocalizedSeo(
  path: MaybeRefOrGetter<string>,
  title: MaybeRefOrGetter<string>,
  description: MaybeRefOrGetter<string>,
) {
  const route = useRoute();
  const locale = computed(() => siteLocaleFromPath(route.path));
  const canonicalUrl = computed(() => localizedAbsoluteUrl(toValue(path), locale.value));

  useSeoMeta({
    title: computed(() => toValue(title)),
    description: computed(() => toValue(description)),
    robots: "index, follow",
    ogTitle: computed(() => toValue(title)),
    ogDescription: computed(() => toValue(description)),
    ogType: "website",
    ogUrl: canonicalUrl,
    ogLocale: computed(() => locale.value.htmlLang.replace("-", "_")),
    ogImage: "https://www.cookie-build.com/cookie-build-social.webp",
    ogImageAlt: computed(() => SITE_COPY[locale.value.code].common.socialImageAlt),
    twitterCard: "summary_large_image",
    twitterTitle: computed(() => toValue(title)),
    twitterDescription: computed(() => toValue(description)),
    twitterImage: "https://www.cookie-build.com/cookie-build-social.webp",
    twitterImageAlt: computed(() => SITE_COPY[locale.value.code].common.socialImageAlt),
  });

  useHead(() => ({
    htmlAttrs: { lang: locale.value.htmlLang },
    link: [
      { rel: "canonical", href: canonicalUrl.value },
      ...localizedSeoLinks(toValue(path)),
    ],
  }));

  return { locale, canonicalUrl };
}
