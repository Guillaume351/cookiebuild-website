<template>
  <NuxtLink :to="`/maps/${map.slug}`" class="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 transition hover:border-orange-400/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400">
    <div class="relative aspect-[4/3] overflow-hidden">
      <img :src="map.image" :alt="`Actual Minecraft world render of ${map.name}`" loading="lazy" width="1200" height="900" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      <span class="absolute left-4 top-4 rounded-full bg-zinc-950/90 px-3 py-1 text-xs font-bold text-orange-300">{{ map.status === 'preview' ? 'Coming soon · Map preview' : map.game }}</span>
    </div>
    <div class="p-6">
      <h3 class="text-2xl font-black text-white">{{ map.name }}</h3>
      <p class="mt-3 leading-relaxed text-zinc-400">{{ map.description }}</p>
      <span class="mt-5 inline-flex min-h-11 items-center font-bold text-orange-300">Explore the map →</span>
    </div>
  </NuxtLink>
</template>
<script setup lang="ts">
import type { MapPreview } from "@/utils/map-catalog";
defineProps<{ map: MapPreview }>();
</script>
