<template>
  <article :lang="language" class="space-y-12 sm:space-y-16">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <NuxtLink v-if="article" :to="language === 'fr' ? '/fr/updates' : '/updates'" class="inline-flex min-h-11 items-center font-bold text-amber-300">← {{ copy.back }}</NuxtLink>
      <span v-else class="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Cookie Build / Fat King</span>
      <nav class="flex gap-2" aria-label="Language"><NuxtLink v-for="lang in ['en', 'fr']" :key="lang" :to="`${lang === 'fr' ? '/fr' : ''}${stripSiteLocale(route.path)}`" :aria-current="language === lang ? 'page' : undefined" class="inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-bold" :class="language === lang ? 'border-amber-500 text-amber-300' : 'border-zinc-700 text-zinc-400'">{{ lang === 'fr' ? 'Français' : 'English' }}</NuxtLink></nav>
    </div>
    <header class="relative isolate overflow-hidden rounded-[2rem] border border-amber-500/25 bg-zinc-950">
      <img :src="map.image" :alt="copy.mapsTitle" fetchpriority="high" width="1200" height="900" class="absolute inset-0 -z-20 h-full w-full object-cover opacity-70" />
      <div class="absolute inset-0 -z-10 bg-gradient-to-r from-black/95 via-black/75 to-black/20" />
      <div class="max-w-3xl px-6 py-14 sm:px-12 md:py-24">
        <p class="mb-6 inline-block rounded-full border border-amber-400/40 bg-black/40 px-4 py-2 text-sm font-bold text-amber-300">{{ copy.badge }}</p>
        <h1 v-if="article" class="text-4xl font-black tracking-tight text-white sm:text-6xl">{{ copy.articleTitle }}</h1>
        <h1 v-else class="text-7xl font-black tracking-tighter text-white sm:text-8xl">FAT <span class="text-amber-400">KING</span></h1>
        <p class="mt-7 text-2xl font-bold leading-tight text-white sm:text-3xl">{{ article ? copy.articleIntro : copy.headline }}</p>
        <p class="mt-5 max-w-xl text-lg leading-relaxed text-zinc-200">{{ copy.intro }}</p>
        <div class="mt-8 flex flex-wrap gap-3"><a href="#fat-king-map" class="inline-flex min-h-12 items-center rounded-xl bg-amber-400 px-5 font-bold text-black hover:bg-amber-300">{{ copy.mapsTitle }} ↓</a><button type="button" class="min-h-12 rounded-xl border border-white/30 bg-black/30 px-5 font-bold text-white hover:bg-black/60" @click="share">{{ copy.share }}</button></div>
        <p role="status" class="mt-3 break-all text-sm text-amber-200">{{ shareStatus }}</p>
      </div>
    </header>
    <p class="rounded-2xl border border-amber-500/25 bg-amber-950/20 p-5 leading-relaxed text-amber-200">{{ copy.status }}</p>
    <BetaPlayInstructions command="/fatking play" :french="language === 'fr'" />
    <section aria-labelledby="fat-rules"><h2 id="fat-rules" class="mb-8 text-3xl font-black text-white sm:text-4xl">{{ copy.rulesTitle }}</h2><div class="grid gap-5 md:grid-cols-3"><div v-for="(step, index) in copy.steps" :key="step.title" class="rounded-3xl border border-zinc-800 bg-zinc-900 p-7"><p class="text-4xl font-black text-amber-400/70">0{{ index + 1 }}</p><h3 class="mt-5 text-xl font-bold text-white">{{ step.title }}</h3><p class="mt-4 leading-relaxed text-zinc-300">{{ step.text }}</p></div></div></section>
    <section class="grid gap-8 lg:grid-cols-2">
      <div class="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-zinc-900 to-amber-950/30 p-7 sm:p-9"><h2 class="text-2xl font-black text-white">{{ copy.riskTitle }}</h2><p class="mt-5 leading-relaxed text-zinc-300">{{ copy.risk }}</p><div class="mt-7 grid grid-cols-3 gap-3" :aria-label="language === 'fr' ? 'Or et points par seconde' : 'Gold and points per second'"><div v-for="sample in [{gold:1,points:1},{gold:16,points:4},{gold:64,points:8}]" :key="sample.gold" class="rounded-xl border border-amber-500/20 bg-black/25 p-4 text-center"><p class="text-3xl font-black text-amber-300">{{ sample.gold }}</p><p class="text-xs text-zinc-300">{{ language === 'fr' ? 'lingots' : 'ingots' }}</p><p class="mt-3 font-bold text-white">{{ sample.points }} pt/s</p></div></div></div>
      <div class="p-3 sm:p-6"><h2 class="text-2xl font-black text-white">{{ copy.compassTitle }}</h2><p class="mt-5 leading-relaxed text-zinc-300">{{ copy.compass }}</p><h2 class="mt-9 text-2xl font-black text-white">{{ copy.minesTitle }}</h2><p class="mt-5 leading-relaxed text-zinc-300">{{ copy.mines }}</p></div>
    </section>
    <section id="fat-king-map" class="scroll-mt-24"><h2 class="text-3xl font-black text-white sm:text-4xl">{{ copy.mapsTitle }}</h2><p class="mb-7 mt-4 max-w-3xl text-lg text-zinc-300">{{ copy.mapsIntro }}</p><MapWorldViewer :map="map" /><div class="mt-5 flex flex-wrap gap-6"><NuxtLink :to="`/maps/${map.slug}`" class="inline-flex min-h-11 items-center font-bold text-amber-300">{{ copy.mapLink }} →</NuxtLink><NuxtLink to="/maps" class="inline-flex min-h-11 items-center font-bold text-zinc-300">{{ copy.atlas }} →</NuxtLink></div><details class="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"><summary class="cursor-pointer py-2 font-bold text-zinc-200">{{ copy.tiny }}</summary><img src="/maps/fat-king-crown-top.webp" :alt="copy.tiny" width="1200" height="900" loading="lazy" class="mt-4 w-full rounded-xl" /></details></section>
    <section aria-labelledby="fat-districts"><h2 id="fat-districts" class="mb-7 text-3xl font-black text-white">{{ copy.districtsTitle }}</h2><div class="grid gap-6 md:grid-cols-2"><figure v-for="district in copy.districts" :key="district.slug" class="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900"><a :href="`/maps/fat-king-${district.slug}.webp`" target="_blank" rel="noopener noreferrer" :aria-label="district.title"><img :src="`/maps/fat-king-${district.slug}.webp`" :alt="district.title" width="1200" height="900" loading="lazy" class="aspect-[4/3] w-full object-cover" /></a><figcaption class="p-6"><h3 class="text-xl font-bold text-white">{{ district.title }}</h3><p class="mt-3 leading-relaxed text-zinc-300">{{ district.text }}</p></figcaption></figure></div></section>
    <section class="grid gap-8 lg:grid-cols-2"><div><h2 class="text-2xl font-black text-white">{{ copy.deathTitle }}</h2><p class="mt-5 leading-relaxed text-zinc-300">{{ copy.death }}</p><p class="mt-4 leading-relaxed text-zinc-400">{{ copy.ending }}</p></div><div class="rounded-3xl border border-zinc-800 p-7"><h2 class="text-2xl font-black text-white">{{ copy.editionTitle }}</h2><p class="mt-5 leading-relaxed text-zinc-400">{{ copy.edition }}</p></div></section>
    <section class="rounded-3xl border border-amber-500/25 bg-zinc-900 p-7 sm:p-10"><h2 class="text-3xl font-black text-white">{{ copy.feedbackTitle }}</h2><ul class="mt-6 list-disc space-y-4 pl-5 text-lg text-zinc-300"><li v-for="question in copy.questions" :key="question">{{ question }}</li></ul><div class="mt-7 flex flex-wrap gap-5"><button type="button" class="min-h-11 rounded-xl bg-amber-400 px-5 font-bold text-black hover:bg-amber-300" @click="share">{{ copy.share }}</button><NuxtLink v-if="!article" :to="`${language === 'fr' ? '/fr' : ''}/updates/fat-king-preview`" class="inline-flex min-h-11 items-center font-bold text-amber-300">{{ copy.article }} →</NuxtLink></div><p role="status" class="mt-3 break-all text-sm text-amber-200">{{ shareStatus }}</p></section>
  </article>
</template>
<script setup lang="ts">
import { stripSiteLocale, siteLocaleFromPath } from "@/utils/site-locales";
import { findMapPreview } from "@/utils/map-catalog";
import { fatKingPreviewCopy } from "@/utils/fat-king-preview";
const props = defineProps<{ article?: boolean }>();
const route = useRoute();
const language = computed(() => siteLocaleFromPath(route.path).code === 'fr' ? 'fr' : 'en');
const copy = computed(() => fatKingPreviewCopy[language.value]);
const map = findMapPreview('fat-king-crown')!;
const shareStatus = ref('');
async function share() {
  const url = `https://www.cookie-build.com${route.path}`;
  try { await navigator.clipboard.writeText(url); shareStatus.value = copy.value.copied; }
  catch { shareStatus.value = url; }
}
watch(language, () => { shareStatus.value = ''; });
useSeoMeta({ title: () => `${props.article ? copy.value.articleTitle : 'Fat King'} — ${language.value === 'fr' ? 'Bêta publique' : 'Public beta'} | Cookie Build`, description: () => copy.value.intro, ogTitle: () => `${props.article ? copy.value.articleTitle : 'Fat King'} — ${copy.value.badge}`, ogDescription: () => copy.value.intro, ogImage: 'https://www.cookie-build.com/maps/fat-king-crown.webp', twitterCard: 'summary_large_image' });
useHead(() => ({ htmlAttrs: { lang: language.value }, link: [{ rel: 'canonical', href: `https://www.cookie-build.com${route.path}` }] }));
</script>
