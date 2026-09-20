<template>
  <div class="space-y-8">
    <NuxtLink to="/maps" class="inline-flex min-h-11 items-center font-bold text-orange-300">← All maps</NuxtLink>
    <header class="flex flex-wrap items-end justify-between gap-6">
      <div class="max-w-3xl"><p class="font-bold text-orange-400">{{ map.game }}{{ map.status === 'preview' ? ' · Coming soon' : '' }}</p><h1 class="mt-3 text-4xl font-black text-white md:text-6xl">{{ map.name }}</h1><p class="mt-5 text-lg leading-relaxed text-zinc-300">{{ map.description }}</p></div>
      <div><button type="button" class="min-h-11 rounded-xl border border-zinc-600 px-5 font-bold text-white hover:border-orange-400" @click="copyLink">Copy map link</button><p role="status" class="mt-2 max-w-xs break-all text-sm text-orange-300">{{ shareStatus }}</p></div>
    </header>
    <MapWorldViewer :map="map" />
    <section v-if="map.districts.length" aria-labelledby="districts-title"><h2 id="districts-title" class="mb-5 text-2xl font-black text-white">{{ map.game === 'Fat King' ? 'One crown. Multiple routes.' : 'Four districts. Different opportunities.' }}</h2><div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div v-for="district in map.districts" :key="district.name" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><p class="text-sm font-bold uppercase tracking-wider text-orange-400">{{ district.role }}</p><h3 class="mt-2 text-xl font-bold text-white">{{ district.name }}</h3></div></div><p class="mt-5 text-zinc-400">{{ map.game === 'Fat King' ? 'Equal starting supplies, shared mines and several routes between bases. Layouts and timings are being tested privately before public access.' : 'Districts have different specialties. Everyone starts with basic supplies, and the workshop is optional. Layouts and resource quantities are being tuned for the game.' }}</p></section>
    <NuxtLink v-if="map.game === 'Fat King'" to="/fr/fat-king" class="inline-flex min-h-11 items-center font-bold text-amber-300">Découvrir les règles de Fat King →</NuxtLink>
    <NuxtLink v-if="map.game === 'Nomad Wars'" to="/nomad-wars" class="inline-flex min-h-11 items-center font-bold text-orange-300">Read the Nomad Wars rules and preview →</NuxtLink>
  </div>
</template>
<script setup lang="ts">
import { findMapPreview } from "@/utils/map-catalog";
const route = useRoute();
const map = computed(() => {
  const found = findMapPreview(String(route.params.slug));
  if (!found) throw createError({ statusCode: 404, statusMessage: "Map not found" });
  return found;
});
const shareStatus = ref("");
async function copyLink() {
  const url = `https://www.cookie-build.com/maps/${map.value.slug}`;
  try { await navigator.clipboard.writeText(url); shareStatus.value = "Map link copied."; }
  catch { shareStatus.value = url; }
}
useSeoMeta({ title: () => `${map.value.name} — Minecraft map | Cookie Build`, description: () => map.value.description, ogTitle: () => `${map.value.name} — Cookie Build map`, ogDescription: () => map.value.description, ogImage: () => `https://www.cookie-build.com${map.value.image}`, twitterCard: "summary_large_image" });
useHead(() => ({ link: [{ rel: "canonical", href: `https://www.cookie-build.com/maps/${map.value.slug}` }] }));
</script>
