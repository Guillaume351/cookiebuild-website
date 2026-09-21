<template>
  <div class="space-y-12">
    <header class="max-w-3xl py-8">
      <p class="text-sm font-bold uppercase tracking-[0.25em] text-orange-400">{{ copy.atlas }}</p>
      <h1 class="mt-5 text-5xl font-black tracking-tight text-white md:text-7xl">{{ copy.title }}</h1>
      <p class="mt-6 text-lg leading-relaxed text-zinc-300">{{ copy.intro }}</p>
      <p class="mt-4 text-zinc-400">{{ copy.availability }}</p>
    </header>
    <div class="flex flex-wrap gap-2" :aria-label="copy.filter"><button v-for="game in games" :key="game" type="button" :aria-pressed="selectedGame === game" class="min-h-11 rounded-full border px-4 text-sm font-bold" :class="selectedGame === game ? 'border-orange-500 bg-orange-600 text-white' : 'border-zinc-700 bg-zinc-900 text-zinc-300'" @click="selectedGame = game">{{ game === 'all' ? copy.all : game }}</button></div>
    <section v-for="group in groups" :key="group.game" :aria-label="`${group.game} — ${copy.back}`">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4"><h2 class="text-3xl font-black text-white">{{ group.game }}{{ ['Nomad Wars', 'Fat King'].includes(group.game) ? ` · ${ui.beta}` : '' }}</h2><NuxtLink v-if="['Nomad Wars', 'Fat King'].includes(group.game)" :to="localizePath(group.game === 'Fat King' ? '/fat-king' : '/nomad-wars')" class="inline-flex min-h-11 items-center font-bold text-orange-300">{{ ui.discover }} →</NuxtLink></div>
      <div class="grid gap-6 md:grid-cols-3"><MapPreviewCard v-for="map in group.maps" :key="map.slug" :map="map" /></div>
    </section>
    <p class="text-sm text-zinc-400">{{ copy.note }}</p>
  </div>
</template>
<script setup lang="ts">
import { mapCatalog } from "@/utils/map-catalog";
import { mapCopy } from "@/utils/map-catalog-localized";
import { gameUiCopy } from "@/utils/game-ui-copy";
const { locale, localizePath } = useSiteLocale();
const copy = computed(() => mapCopy[locale.value.code]);
const ui = computed(() => gameUiCopy[locale.value.code]);
const selectedGame = ref("all");
const games = ["all", ...new Set(mapCatalog.map((map) => map.game))];
const groups = computed(() => games.slice(1).filter((game) => selectedGame.value === "all" || selectedGame.value === game).map((game) => ({ game, maps: mapCatalog.filter((map) => map.game === game) })));
useLocalizedSeo("/maps", () => `${copy.value.seoTitle} | Cookie Build`, () => copy.value.seoDescription);
useSeoMeta({ ogImage: "https://www.cookie-build.com/maps/nomad-oasis.webp", twitterImage: "https://www.cookie-build.com/maps/nomad-oasis.webp", ogImageAlt: () => `${ui.value.image}: Sunken Oasis`, twitterImageAlt: () => `${ui.value.image}: Sunken Oasis` });
</script>
