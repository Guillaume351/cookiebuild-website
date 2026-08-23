<template>
  <div class="space-y-12">
    <header class="mx-auto max-w-4xl py-10 text-center">
      <Badge class="mb-5 bg-orange-600 hover:bg-orange-600">{{ copy.catalog.badge }}</Badge>
      <h1 class="text-4xl font-black tracking-tight text-white md:text-6xl">{{ copy.catalog.title }}</h1>
      <p class="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-zinc-300 md:text-xl">
        {{ copy.catalog.intro }}
      </p>
    </header>

    <section aria-labelledby="all-games-title">
      <h2 id="all-games-title" class="sr-only">{{ copy.catalog.allModes }}</h2>
      <div class="grid gap-6 md:grid-cols-2">
        <NuxtLink
          v-for="game in localizedGames"
          :key="game.slug"
          :to="game.path"
          class="group rounded-2xl border border-zinc-800 bg-zinc-900 p-7 transition hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-xl"
        >
          <div class="flex items-start gap-4">
            <img :src="game.icon" :alt="game.name" class="h-12 w-12 transition-transform group-hover:scale-110" />
            <div>
              <h3 class="text-2xl font-black text-white">{{ game.name }}</h3>
              <p class="mt-3 leading-relaxed text-zinc-400">{{ game.cardDescription }}</p>
              <span class="mt-5 inline-flex min-h-11 items-center font-bold text-orange-400 group-hover:text-orange-300">
                {{ copy.catalog.viewGuide(game.name) }}
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import Badge from "@/components/ui/badge/Badge.vue";
import { COOKIE_BUILD_SITE_URL } from "@/utils/game-landings";
import { localizedGameLandings } from "@/utils/game-landings-localized";

definePageMeta({ alias: ["/bg/games", "/es/games", "/hi/games", "/pt-br/games"] });

const { locale, copy } = useSiteLocale();
const localizedGames = computed(() => localizedGameLandings(locale.value.code));

useLocalizedSeo(
  "/games",
  computed(() => copy.value.catalog.seoTitle),
  computed(() => copy.value.catalog.seoDescription),
);

useHead(() => ({
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: copy.value.catalog.title,
        inLanguage: locale.value.htmlLang,
        itemListElement: localizedGames.value.map((game, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: game.name,
          url: `${COOKIE_BUILD_SITE_URL}${game.path}`,
        })),
      }),
    },
  ],
}));
</script>
