<template>
  <div class="space-y-12">
    <header class="max-w-3xl py-8">
      <p class="text-sm font-bold uppercase tracking-[0.25em] text-orange-400">The Cookie Build atlas</p>
      <h1 class="mt-5 text-5xl font-black tracking-tight text-white md:text-7xl">A world worth exploring.</h1>
      <p class="mt-6 text-lg leading-relaxed text-zinc-300">Step inside our maps before your next adventure. Explore real Minecraft builds in 3D or switch to a tiny map for the bigger picture.</p>
      <p class="mt-4 text-zinc-400">Browse the published map snapshots by game, including the upcoming Fat King and Nomad Wars worlds. Availability follows each game’s current rotation.</p>
    </header>
    <div class="flex flex-wrap gap-2" aria-label="Filter maps by game"><button v-for="game in games" :key="game" type="button" :aria-pressed="selectedGame === game" class="min-h-11 rounded-full border px-4 text-sm font-bold" :class="selectedGame === game ? 'border-orange-500 bg-orange-600 text-white' : 'border-zinc-700 bg-zinc-900 text-zinc-300'" @click="selectedGame = game">{{ game }}</button></div>
    <section v-for="group in groups" :key="group.game" :aria-label="`${group.game} maps`">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4"><h2 class="text-3xl font-black text-white">{{ group.game }}{{ ['Nomad Wars', 'Fat King'].includes(group.game) ? ' · Coming soon' : '' }}</h2><NuxtLink v-if="['Nomad Wars', 'Fat King'].includes(group.game)" :to="group.game === 'Fat King' ? '/fat-king' : '/nomad-wars'" class="inline-flex min-h-11 items-center font-bold text-orange-300">Discover the game →</NuxtLink></div>
      <div class="grid gap-6 md:grid-cols-3"><MapPreviewCard v-for="map in group.maps" :key="map.slug" :map="map" /></div>
    </section>
    <p class="text-sm text-zinc-400">These are actual world renders, not concept illustrations. Preview layouts and game balance may change before release.</p>
  </div>
</template>
<script setup lang="ts">
import { mapCatalog } from "@/utils/map-catalog";
const selectedGame = ref("All games");
const games = ["All games", ...new Set(mapCatalog.map((map) => map.game))];
const groups = computed(() => games.slice(1).filter((game) => selectedGame.value === "All games" || selectedGame.value === game).map((game) => ({ game, maps: mapCatalog.filter((map) => map.game === game) })));
useSeoMeta({ title: "Explore our Minecraft maps | Cookie Build", description: "Explore real Cookie Build Minecraft maps in 3D. Discover Fat King and Nomad Wars worlds, their mines, districts and arenas.", ogImage: "https://www.cookie-build.com/maps/nomad-oasis.webp" });
useHead({ link: [{ rel: "canonical", href: "https://www.cookie-build.com/maps" }] });
</script>
