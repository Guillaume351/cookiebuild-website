<template>
  <section class="overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-950" :aria-label="`${map.name} interactive map`">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 p-4">
      <div class="flex gap-2" aria-label="Map view">
        <button v-for="view in views" :key="view.label" type="button" :aria-pressed="topDown === view.topDown" class="min-h-11 rounded-xl px-4 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400" :class="topDown === view.topDown ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-300'" @click="topDown = view.topDown">{{ view.label }}</button>
      </div>
      <button v-if="active" type="button" class="inline-flex min-h-11 items-center rounded-xl border border-zinc-600 px-3 text-sm font-bold text-zinc-200 hover:border-orange-400" @click="active = false">Show still image</button>
      <a :href="viewerUrl" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center text-sm font-bold text-orange-300">Open full screen ↗</a>
    </div>
    <div class="relative h-[min(70vh,700px)] min-h-[360px]">
      <iframe v-if="active" :key="viewerUrl" :src="viewerUrl" :title="`${map.name} — ${topDown ? 'top-down' : '3D'} map`" class="absolute inset-0 h-full w-full border-0" loading="lazy" allow="fullscreen" referrerpolicy="same-origin" />
      <template v-else>
        <img :src="map.image" :alt="`Actual Minecraft render of ${map.name}`" class="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div class="absolute inset-0 flex items-center justify-center bg-black/20 p-6">
          <button type="button" class="min-h-14 rounded-2xl bg-orange-600 px-7 py-4 font-black text-white shadow-xl hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" @click="active = true">Explore in {{ topDown ? 'top-down view' : '3D' }}</button>
        </div>
      </template>
    </div>
    <p class="border-t border-zinc-800 p-4 text-sm leading-relaxed text-zinc-400">Real Minecraft world snapshot. Drag to explore and zoom to inspect the buildings. The interactive view loads only when you open it; it needs WebGL. If it does not load, <a :href="map.image" class="text-orange-300 underline">open the still image</a>.<span v-if="map.game === 'Nomad Wars'"> Moving gameplay zones are not shown in this map preview.</span></p>
  </section>
</template>
<script setup lang="ts">
import { mapViewerUrl, type MapPreview } from "@/utils/map-catalog";
const props = defineProps<{ map: MapPreview }>();
const active = ref(false);
const topDown = ref(false);
const views = [{ label: "3D world", topDown: false }, { label: "Tiny map", topDown: true }];
const viewerUrl = computed(() => mapViewerUrl(props.map, topDown.value));
watch(() => props.map.slug, () => { active.value = false; topDown.value = false; });
</script>
