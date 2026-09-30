<template>
  <div class="space-y-12">
    <nav :aria-label="historyCopy.breadcrumbLabel" class="text-sm text-zinc-400">
      <ol class="flex flex-wrap items-center gap-2">
        <li>
          <NuxtLink :to="homePath" class="font-semibold text-zinc-300 transition hover:text-orange-300">
            {{ historyCopy.breadcrumbHome }}
          </NuxtLink>
        </li>
        <li aria-hidden="true">
          <ChevronRight class="h-4 w-4 text-zinc-600" aria-hidden="true" />
        </li>
        <li>
          <span aria-current="page" class="font-semibold text-orange-400">{{ historyCopy.breadcrumbCurrent }}</span>
        </li>
      </ol>
    </nav>

    <header class="grid items-center gap-8 lg:grid-cols-2">
      <div>
        <p class="font-bold uppercase tracking-wider text-orange-400">{{ historyCopy.eyebrow }}</p>
        <h1 class="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">{{ historyCopy.h1 }}</h1>
        <p class="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-300 md:text-xl">{{ historyCopy.intro }}</p>
      </div>
      <img
        src="/lobby-hero-clean-960.webp"
        width="960"
        height="621"
        fetchpriority="high"
        decoding="async"
        :alt="historyCopy.heroAlt"
        class="h-auto w-full rounded-3xl border border-zinc-800 object-cover shadow-2xl"
      />
    </header>

    <section aria-labelledby="history-timeline-title" class="rounded-3xl border border-zinc-800 bg-zinc-950 p-7 sm:p-10">
      <h2 id="history-timeline-title" class="text-3xl font-black text-white">{{ historyCopy.timelineTitle }}</h2>
      <ol class="mt-8 space-y-6 border-l-2 border-orange-500/30 pl-6 sm:pl-8">
        <li v-for="milestone in milestones" :key="milestone.id" class="relative">
          <span
            class="absolute -left-[2.45rem] top-1 flex h-7 w-7 items-center justify-center rounded-full border border-orange-500/50 bg-zinc-900 sm:-left-[2.95rem]"
            aria-hidden="true"
          >
            <component :is="milestone.icon" class="h-4 w-4 text-orange-400" aria-hidden="true" />
          </span>
          <article class="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <p class="text-sm font-bold uppercase tracking-wider text-orange-400">
              <time v-if="milestone.datetime" :datetime="milestone.datetime">{{ milestone.dateLabel }}</time>
              <template v-else>{{ milestone.dateLabel }}</template>
            </p>
            <h3 class="mt-2 text-2xl font-black text-white">{{ milestone.title }}</h3>
            <p class="mt-3 leading-relaxed text-zinc-300">{{ milestone.body }}</p>
          </article>
        </li>
      </ol>
    </section>

    <section aria-labelledby="history-play-title">
      <h2 id="history-play-title" class="text-3xl font-black text-white">{{ historyCopy.playTitle }}</h2>
      <p class="mt-3 max-w-2xl text-lg text-zinc-300">{{ historyCopy.playIntro }}</p>
      <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="link in playLinks" :key="link.id">
          <NuxtLink
            :to="link.to"
            class="group flex h-full items-start gap-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-6 transition hover:-translate-y-1 hover:border-orange-500/60"
          >
            <component :is="link.icon" class="mt-1 h-6 w-6 shrink-0 text-orange-400" aria-hidden="true" />
            <span>
              <span class="block text-xl font-black text-white group-hover:text-orange-300">{{ link.label }}</span>
              <span class="mt-1 block text-zinc-400">{{ link.description }}</span>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section
      aria-labelledby="history-community-title"
      class="rounded-3xl border border-orange-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-7 sm:p-10"
    >
      <h2 id="history-community-title" class="text-3xl font-black text-white">{{ historyCopy.communityTitle }}</h2>
      <p class="mt-4 max-w-2xl text-lg text-zinc-300">{{ historyCopy.communityBody }}</p>
      <div class="mt-6 flex flex-wrap gap-4">
        <a
          href="https://discord.gg/ajmPnwh9g8"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-600 px-5 font-bold text-white transition hover:bg-orange-500"
        >
          <MessageCircle class="h-5 w-5" aria-hidden="true" />
          {{ historyCopy.discordCta }}
          <span class="sr-only">{{ historyCopy.newTab }}</span>
        </a>
        <a
          href="https://x.com/CookieBuild"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 px-5 font-bold text-zinc-200 transition hover:border-orange-500/60 hover:text-orange-300"
        >
          <ExternalLink class="h-5 w-5" aria-hidden="true" />
          {{ historyCopy.followX }}
          <span class="sr-only">{{ historyCopy.newTab }}</span>
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronRight,
  Cookie,
  Crown,
  ExternalLink,
  Flag,
  Heart,
  MessageCircle,
  Rocket,
  Smartphone,
  Sparkles,
  TreePine,
  Users,
  Compass,
  BedDouble,
  LayoutGrid,
  LogIn,
} from "@lucide/vue";
import type { Component } from "vue";
import { HISTORY_COPY, HISTORY_MILESTONES, HISTORY_PEAK_PLAYERS, type HistoryMilestoneId } from "@/utils/history-copy";
import { localizedAbsoluteUrl } from "@/utils/site-locales";

definePageMeta({ alias: ["/fr/notre-histoire", "/de/history", "/it/history", "/bg/history", "/es/history", "/hi/history", "/pt-br/history"] });

const { locale, localizePath } = useSiteLocale();
const historyCopy = computed(() => HISTORY_COPY[locale.value.code]);
const homePath = computed(() => localizePath("/"));

const peakPlayers = computed(() => new Intl.NumberFormat(locale.value.htmlLang).format(HISTORY_PEAK_PLAYERS));

const MILESTONE_ICONS: Record<HistoryMilestoneId, Component> = {
  origins: Cookie,
  peak: Users,
  relaunch: Rocket,
  update: Smartphone,
  betas: Sparkles,
  newModes: Flag,
  today: Heart,
};

function formatMilestoneDate(datetime: string, htmlLang: string) {
  const [year, month] = datetime.split("-").map(Number);
  const date = new Date(Date.UTC(year!, (month || 1) - 1, 1));
  return new Intl.DateTimeFormat(htmlLang, month
    ? { year: "numeric", month: "long", timeZone: "UTC" }
    : { year: "numeric", timeZone: "UTC" }).format(date);
}

const milestones = computed(() => {
  const text = historyCopy.value;
  return HISTORY_MILESTONES.map((milestone) => {
    const title = milestone.id === "peak"
      ? text.milestones.peak.title(peakPlayers.value)
      : text.milestones[milestone.id].title;
    const dateLabel = milestone.datetime
      ? formatMilestoneDate(milestone.datetime, locale.value.htmlLang)
      : milestone.id === "peak" ? text.peakLabel : text.todayLabel;
    return {
      id: milestone.id,
      datetime: milestone.datetime,
      dateLabel,
      title,
      body: text.milestones[milestone.id].body,
      icon: MILESTONE_ICONS[milestone.id],
    };
  });
});

const playLinks = computed(() => {
  const links = historyCopy.value.links;
  return [
    { id: "games", to: localizePath("/games"), icon: LayoutGrid, ...links.games },
    { id: "skyblock", to: localizePath("/skyblock"), icon: TreePine, ...links.skyblock },
    { id: "bedwars", to: localizePath("/bedwars"), icon: BedDouble, ...links.bedwars },
    { id: "fatKing", to: localizePath("/fat-king"), icon: Crown, ...links.fatKing },
    { id: "nomadWars", to: localizePath("/nomad-wars"), icon: Compass, ...links.nomadWars },
    { id: "join", to: localizePath("/join"), icon: LogIn, ...links.join },
  ];
});

const metaDescription = computed(() => historyCopy.value.metaDescription(peakPlayers.value));

useLocalizedSeo("/history", () => historyCopy.value.seoTitle, () => metaDescription.value);

useHead(() => {
  const pageUrl = localizedAbsoluteUrl("/history", locale.value);
  return {
    script: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "AboutPage",
              name: historyCopy.value.seoTitle,
              description: metaDescription.value,
              inLanguage: locale.value.htmlLang,
              url: pageUrl,
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: historyCopy.value.breadcrumbHome,
                  item: localizedAbsoluteUrl("/", locale.value),
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: historyCopy.value.breadcrumbCurrent,
                  item: pageUrl,
                },
              ],
            },
          ],
        }),
      },
    ],
  };
});
</script>
