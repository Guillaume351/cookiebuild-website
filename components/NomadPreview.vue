<template>
  <article :lang="language" class="space-y-14">
    <div class="flex flex-wrap items-center justify-between gap-4"><NuxtLink v-if="article" to="/updates" class="inline-flex min-h-11 items-center font-bold text-orange-300">← Updates</NuxtLink><span v-else class="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Cookie Build / Nomad Wars</span><div class="flex gap-2" aria-label="Language"><NuxtLink v-for="locale in ['en', 'fr']" :key="locale" :to="`${locale === 'fr' ? '/fr' : ''}${stripSiteLocale(route.path)}`" :aria-current="language === locale ? 'true' : undefined" class="inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-bold" :class="language === locale ? 'border-orange-500 text-orange-300' : 'border-zinc-700 text-zinc-400'">{{ locale === 'fr' ? 'Français' : 'English' }}</NuxtLink></div></div>
    <header class="relative isolate overflow-hidden rounded-[2rem] border border-orange-500/20 bg-zinc-950">
      <img src="/maps/nomad-oasis.webp" alt="Nomad Wars — Sunken Oasis Minecraft world" fetchpriority="high" width="1200" height="900" class="absolute inset-0 -z-20 h-full w-full object-cover opacity-60" />
      <div class="absolute inset-0 -z-10 bg-gradient-to-r from-black/95 via-black/70 to-black/10" />
      <div class="max-w-3xl px-6 py-16 sm:px-12 md:py-24"><p class="mb-6 inline-block rounded-full border border-orange-400/40 bg-black/40 px-4 py-2 text-sm font-bold text-orange-300">{{ copy.badge }}</p><h1 class="text-5xl font-black tracking-tighter text-white sm:text-7xl md:text-8xl">NOMAD<br /><span class="text-orange-400">WARS</span></h1><p class="mt-7 text-2xl font-bold text-white sm:text-3xl">{{ copy.headline }}</p><p class="mt-5 max-w-xl text-lg leading-relaxed text-zinc-200">{{ copy.intro }}</p><div class="mt-8 flex flex-wrap gap-3"><a href="#preview-maps" class="inline-flex min-h-12 items-center rounded-xl bg-orange-600 px-5 font-bold text-white hover:bg-orange-500">{{ copy.mapsTitle }} ↓</a><button type="button" class="min-h-12 rounded-xl border border-white/30 bg-black/30 px-5 font-bold text-white hover:bg-black/60" @click="share">{{ copy.share }}</button></div><p role="status" class="mt-3 break-all text-sm text-orange-200">{{ shareStatus }}</p></div>
    </header>
    <p class="rounded-2xl border border-orange-500/25 bg-orange-950/20 p-5 leading-relaxed text-orange-200">{{ copy.status }}</p>
    <BetaPlayInstructions command="/nomadwars play" :french="language === 'fr'" />
    <section aria-labelledby="nomad-rules"><h2 id="nomad-rules" class="mb-8 text-3xl font-black text-white sm:text-4xl">{{ copy.rulesTitle }}</h2><div class="grid gap-5 md:grid-cols-3"><div v-for="(step, index) in copy.steps" :key="step.title" class="rounded-3xl border border-zinc-800 bg-zinc-900 p-7"><p class="text-4xl font-black text-orange-500/60">0{{ index + 1 }}</p><h3 class="mt-5 text-xl font-bold text-white">{{ step.title }}</h3><p class="mt-4 leading-relaxed text-zinc-400">{{ step.text }}</p></div></div></section>
    <section class="grid gap-8 lg:grid-cols-2"><div class="rounded-3xl border border-zinc-800 bg-zinc-900 p-7 sm:p-9"><h2 class="text-2xl font-black text-white">{{ copy.workshopTitle }}</h2><p class="mt-5 leading-relaxed text-zinc-300">{{ copy.workshop }}</p></div><div class="p-3 sm:p-6"><h2 class="text-2xl font-black text-white">{{ copy.fairnessTitle }}</h2><p class="mt-5 leading-relaxed text-zinc-400">{{ copy.fairness }}</p></div></section>
    <section id="preview-maps" class="scroll-mt-24"><h2 class="text-3xl font-black text-white sm:text-4xl">{{ copy.mapsTitle }}</h2><p class="mb-7 mt-4 text-lg text-zinc-400">{{ copy.mapsIntro }}</p><div class="grid gap-6 md:grid-cols-3"><MapPreviewCard v-for="map in nomadMaps" :key="map.slug" :map="map" /></div><NuxtLink to="/maps" class="mt-5 inline-flex min-h-11 items-center font-bold text-orange-300">{{ copy.atlas }} →</NuxtLink></section>
    <section class="max-w-3xl"><h2 class="text-2xl font-black text-white">{{ copy.editionTitle }}</h2><p class="mt-4 leading-relaxed text-zinc-400">{{ copy.edition }}</p></section>
    <section class="rounded-3xl border border-orange-500/25 bg-gradient-to-br from-zinc-900 to-orange-950/30 p-7 sm:p-10"><h2 class="text-3xl font-black text-white">{{ copy.feedbackTitle }}</h2><p class="mt-5 max-w-3xl text-lg leading-relaxed text-zinc-300">{{ copy.feedback }}</p><div class="mt-6 flex flex-wrap gap-5"><a href="https://discord.gg/ajmPnwh9g8" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center font-bold text-orange-300">{{ copy.discord }} ↗</a><NuxtLink v-if="!article" :to="`${language === 'fr' ? '/fr' : ''}/updates/nomad-wars-preview`" class="inline-flex min-h-11 items-center font-bold text-white">{{ copy.article }} →</NuxtLink></div></section>
  </article>
</template>
<script setup lang="ts">
import { stripSiteLocale, siteLocaleFromPath } from "@/utils/site-locales";
import { nomadMaps } from "@/utils/map-catalog";
import { nomadPreviewCopy } from "@/utils/nomad-preview";
defineProps<{ article?: boolean }>();
const route = useRoute();
const language = computed(() => siteLocaleFromPath(route.path).code === 'fr' ? 'fr' : 'en');
const copy = computed(() => nomadPreviewCopy[language.value]);
const shareStatus = ref('');
async function share() {
  const url = `https://www.cookie-build.com${route.path}`;
  try { await navigator.clipboard.writeText(url); shareStatus.value = copy.value.copied; }
  catch { shareStatus.value = url; }
}
watch(language, () => { shareStatus.value = ''; });
useSeoMeta({ title: () => language.value === 'fr' ? 'Nomad Wars — Bêta publique | Cookie Build' : 'Nomad Wars — Public beta | Cookie Build', description: () => copy.value.intro, ogTitle: () => language.value === 'fr' ? 'Nomad Wars — Bêta publique' : 'Nomad Wars — Public beta', ogDescription: () => copy.value.intro, ogImage: 'https://www.cookie-build.com/maps/nomad-oasis.webp', twitterCard: 'summary_large_image' });
useHead(() => ({ htmlAttrs: { lang: language.value }, link: [{ rel: 'canonical', href: `https://www.cookie-build.com${route.path}` }] }));
</script>
