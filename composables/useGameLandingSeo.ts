import type { GameLanding } from "@/utils/game-landings";
import { COOKIE_BUILD_SITE_URL } from "@/utils/game-landings";
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { localizedSeoLinks, localizedSitePath, siteLocaleFromPath } from "@/utils/site-locales";
import { SITE_COPY } from "@/utils/site-copy";

export function useGameLandingSeo(game: MaybeRefOrGetter<GameLanding>) {
  const route = useRoute();
  const landing = computed(() => toValue(game));
  const locale = computed(() => siteLocaleFromPath(route.path));
  const canonicalUrl = computed(() => `${COOKIE_BUILD_SITE_URL}${landing.value.path}`);
  const socialImage = computed(() => landing.value.heroImage
    ? `${COOKIE_BUILD_SITE_URL}${landing.value.heroImage}`
    : `${COOKIE_BUILD_SITE_URL}/cookie-build-social.webp`);

  useSeoMeta({
    title: computed(() => landing.value.seoTitle),
    description: computed(() => landing.value.metaDescription),
    robots: "index, follow",
    ogTitle: computed(() => landing.value.h1),
    ogDescription: computed(() => landing.value.socialDescription),
    ogType: "website",
    ogUrl: canonicalUrl,
    ogLocale: computed(() => locale.value.htmlLang.replace("-", "_")),
    ogImage: socialImage,
    ogImageAlt: computed(() => landing.value.heroImageAlt || "Cookie Build Minecraft server lobby"),
    ogImageWidth: computed(() => String(landing.value.heroImageWidth || 1200)),
    ogImageHeight: computed(() => String(landing.value.heroImageHeight || 630)),
    twitterCard: "summary_large_image",
    twitterTitle: computed(() => landing.value.seoTitle),
    twitterDescription: computed(() => landing.value.socialDescription),
    twitterImage: socialImage,
    twitterImageAlt: computed(() => landing.value.heroImageAlt || "Cookie Build Minecraft server lobby"),
  });

  useHead(() => ({
    htmlAttrs: { lang: locale.value.htmlLang },
    link: [
      { rel: "canonical", href: canonicalUrl.value },
      ...localizedSeoLinks(landing.value.path),
    ],
    script: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": `${canonicalUrl.value}#webpage`,
              url: canonicalUrl.value,
              name: landing.value.seoTitle,
              description: landing.value.metaDescription,
              inLanguage: locale.value.htmlLang,
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Cookie Build",
                  item: `${COOKIE_BUILD_SITE_URL}${localizedSitePath("/", locale.value)}`,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: SITE_COPY[locale.value.code].navigation.games,
                  item: `${COOKIE_BUILD_SITE_URL}${localizedSitePath("/games", locale.value)}`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: landing.value.name,
                  item: canonicalUrl.value,
                },
              ],
            },
            {
              "@type": "FAQPage",
              inLanguage: locale.value.htmlLang,
              mainEntity: landing.value.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.answer,
                },
              })),
            },
          ],
        }),
      },
    ],
  }));
}
