import type { GameLanding } from "@/utils/game-landings";
import { COOKIE_BUILD_SITE_URL } from "@/utils/game-landings";

export function useGameLandingSeo(game: GameLanding) {
  const canonicalUrl = `${COOKIE_BUILD_SITE_URL}${game.path}`;

  useSeoMeta({
    title: game.seoTitle,
    description: game.metaDescription,
    robots: "index, follow",
    ogTitle: game.h1,
    ogDescription: game.socialDescription,
    ogType: "website",
    ogUrl: canonicalUrl,
    ogImage: `${COOKIE_BUILD_SITE_URL}/cookie-build-social.webp`,
    ogImageAlt: "Cookie Build Minecraft server lobby",
    twitterCard: "summary_large_image",
    twitterTitle: game.seoTitle,
    twitterDescription: game.socialDescription,
    twitterImage: `${COOKIE_BUILD_SITE_URL}/cookie-build-social.webp`,
  });

  useHead({
    link: [{ rel: "canonical", href: canonicalUrl }],
    script: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": `${canonicalUrl}#webpage`,
              url: canonicalUrl,
              name: game.seoTitle,
              description: game.metaDescription,
              inLanguage: "en",
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Cookie Build",
                  item: `${COOKIE_BUILD_SITE_URL}/`,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Games",
                  item: `${COOKIE_BUILD_SITE_URL}/games`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: game.name,
                  item: canonicalUrl,
                },
              ],
            },
            {
              "@type": "FAQPage",
              mainEntity: game.faqs.map((faq) => ({
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
  });
}
