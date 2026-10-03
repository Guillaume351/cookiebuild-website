<template>
  <div class="space-y-20">
    <!-- Hero Section -->
    <section
      aria-labelledby="home-title"
      class="relative overflow-hidden rounded-3xl bg-gray-900 text-center text-white shadow-2xl"
    >
      <img
        src="/lobby-hero-clean-960.webp"
        srcset="/lobby-hero-clean-960.webp 960w, /lobby-hero-clean-1600.webp 1600w"
        sizes="(min-width: 1536px) 1504px, 100vw"
        width="1600"
        height="1034"
        fetchpriority="high"
        decoding="async"
        :alt="copy.common.socialImageAlt"
        class="absolute inset-0 z-0 h-full w-full object-cover opacity-50"
      />
      <div
        class="absolute inset-0 z-10 bg-gradient-to-t from-gray-900 via-transparent to-black/30"
        aria-hidden="true"
      ></div>

      <div class="relative z-20 px-6 py-20 md:py-28">
        <p class="mb-4 text-lg font-black uppercase tracking-[0.25em] text-orange-400 drop-shadow">
          Cookie Build <span aria-hidden="true">🍪</span>
        </p>
        <h1
          id="home-title"
          class="mx-auto mb-6 max-w-4xl text-4xl font-extrabold tracking-tight drop-shadow-lg md:text-6xl"
        >
          {{ copy.home.h1 }}
        </h1>
        <p
          class="mx-auto mb-8 max-w-2xl text-lg font-medium text-gray-200 drop-shadow-md md:text-xl"
        >
          {{ copy.home.hero }}
        </p>

        <div class="mx-auto mb-8 grid max-w-xl gap-3 text-left sm:grid-cols-[1fr_auto]">
          <div class="rounded-xl border border-white/15 bg-black/55 p-3 backdrop-blur">
            <p class="text-[11px] font-black uppercase tracking-widest text-zinc-300">{{ copy.gameUi.connectionAddress }}</p>
            <div class="mt-1 flex items-center justify-between gap-3">
              <code class="select-all whitespace-nowrap font-mono text-[15px] font-bold text-white sm:text-base md:text-lg">{{ SERVER_ADDRESS }}</code>
              <button
                type="button"
                class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-white/15 px-3 text-sm font-bold text-white hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                :aria-label="`${copy.common.copy} ${copy.common.serverAddress}`"
                @click="copyText(SERVER_ADDRESS, copy.common.serverAddress)"
              >
                <Copy class="h-4 w-4 sm:mr-2" aria-hidden="true" />
                <span class="hidden sm:inline">{{ copy.home.copyIp }}</span>
              </button>
            </div>
          </div>
          <div class="rounded-xl border border-white/15 bg-black/55 p-3 backdrop-blur">
            <p class="text-[11px] font-black uppercase tracking-widest text-zinc-300">{{ copy.common.bedrockPort }}</p>
            <div class="mt-1 flex items-center justify-between gap-3">
              <code class="select-all font-mono text-base font-bold text-white md:text-lg">{{ BEDROCK_PORT }}</code>
              <button
                type="button"
                class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                :aria-label="`${copy.common.copy} ${copy.common.bedrockPort}`"
                @click="copyText(BEDROCK_PORT, copy.common.bedrockPort)"
              >
                <Copy class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <PlayerCounter class="mb-8 justify-center" :next-event="nextEvent" />

        <div class="flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
          <a
            :href="BEDROCK_ADD_SERVER_URL"
            class="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-green-600 px-8 text-lg font-bold text-white hover:bg-green-700 sm:w-auto md:hidden"
            @click="siteAnalytics.track('bedrock_server_add')"
          >
            <Gamepad2 class="mr-2 h-6 w-6" aria-hidden="true" />
            {{ copy.home.addBedrockDirect }}
          </a>
          <Button
            size="lg"
            class="w-full bg-orange-600 px-8 text-lg font-bold hover:bg-orange-700 sm:w-auto motion-safe:animate-pulse hover:animate-none focus-visible:animate-none"
            @click="showJoinGuide = true; siteAnalytics.track('join_guide_open')"
          >
            <Gamepad2 class="mr-2 h-6 w-6" aria-hidden="true" />
            {{ copy.home.playNow }}
          </Button>
          <a
            :href="DISCORD_INVITE_URL"
            target="_blank"
            rel="noopener"
            class="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-white/20 bg-white/10 px-8 py-3 text-lg font-semibold text-white backdrop-blur-sm hover:bg-white/20 sm:w-auto"
            @click="siteAnalytics.track('discord_open')"
          >
            <Mic class="mr-2 h-6 w-6" aria-hidden="true" />
            {{ copy.home.joinDiscord }}
          </a>
        </div>
        <p class="mt-6 text-sm">
          <NuxtLink :to="localizePath('/join')" class="font-bold text-orange-200 underline underline-offset-4 hover:text-white">
            {{ copy.home.joinGuidesLink }} →
          </NuxtLink>
        </p>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="showJoinGuide"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-title"
        @click.self="showJoinGuide = false"
        @keydown.esc="showJoinGuide = false"
      >
        <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-6 text-left shadow-2xl md:p-8">
          <div class="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 id="join-title" class="text-2xl font-black text-white">{{ copy.home.joinTitle }}</h2>
              <p class="mt-1 text-sm text-zinc-400">{{ copy.home.joinIntro }}</p>
            </div>
            <button
              type="button"
              class="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              :aria-label="copy.home.closeGuide"
              @click="showJoinGuide = false"
            >
              <X class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div class="mb-6 grid grid-cols-3 gap-2" role="tablist" :aria-label="copy.home.editionLabel">
            <button
              v-for="edition in editions"
              :key="edition.id"
              type="button"
              role="tab"
              :aria-selected="selectedEdition === edition.id"
              class="rounded-xl border px-3 py-3 text-sm font-bold transition-colors"
              :class="selectedEdition === edition.id ? 'border-orange-400 bg-orange-500 text-white' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600'"
              @click="selectedEdition = edition.id"
            >
              {{ edition.label }}
            </button>
          </div>

          <div v-if="selectedEdition === 'java'" class="space-y-5 text-zinc-300">
            <ol class="list-decimal space-y-2 pl-5">
              <li v-for="step in copy.home.javaSteps" :key="step">{{ step }}</li>
            </ol>
            <JoinAddress :address="SERVER_ADDRESS" :label="copy.common.serverAddress" @copy="copyText(SERVER_ADDRESS, copy.common.serverAddress)" />
            <NuxtLink :to="localizePath('/join/java')" class="inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">{{ copy.home.joinGuidesLink }} →</NuxtLink>
          </div>

          <div v-else-if="selectedEdition === 'bedrock'" class="space-y-5 text-zinc-300">
            <ol class="list-decimal space-y-2 pl-5">
              <li v-for="step in copy.home.bedrockSteps" :key="step">{{ step }}</li>
            </ol>
            <div class="grid gap-3 sm:grid-cols-2">
              <JoinAddress :address="SERVER_ADDRESS" :label="copy.common.serverAddress" @copy="copyText(SERVER_ADDRESS, copy.common.serverAddress)" />
              <JoinAddress :address="BEDROCK_PORT" :label="copy.common.bedrockPort" @copy="copyText(BEDROCK_PORT, copy.common.bedrockPort)" />
            </div>
            <a
              :href="BEDROCK_ADD_SERVER_URL"
              class="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700"
              @click="siteAnalytics.track('bedrock_server_add')"
            >
              <Gamepad2 class="mr-2 h-5 w-5" aria-hidden="true" />
              {{ copy.home.addBedrock }}
            </a>
            <p class="text-xs text-zinc-500">{{ copy.home.bedrockFallback }}</p>
            <NuxtLink :to="localizePath('/join/mobile')" class="inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">{{ copy.home.joinGuidesLink }} →</NuxtLink>
          </div>

          <div v-else class="space-y-5 text-zinc-300">
            <p>{{ copy.home.consoleText }}</p>
            <div class="grid gap-3 sm:grid-cols-3">
              <NuxtLink
                v-for="console in consoles"
                :key="console.path"
                :to="localizePath(console.path)"
                class="inline-flex min-h-12 items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
              >
                {{ console.label }}
              </NuxtLink>
            </div>
            <NuxtLink :to="localizePath('/join')" class="inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">{{ copy.home.consoleGuide }} →</NuxtLink>
            <p class="text-sm text-zinc-500">{{ copy.home.consoleNotice }}</p>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Minigames Grid -->
    <section aria-labelledby="minigames-title">
      <h2 id="minigames-title" class="mb-10 text-center text-3xl font-bold tracking-tight md:text-4xl text-foreground">
        {{ copy.home.minigamesTitle }}
      </h2>
      <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
        <Card
          v-for="game in minigames"
          :key="game.name"
          class="group relative overflow-hidden border-border bg-card transition-all duration-300 hover:border-orange-500/50 hover:shadow-2xl motion-reduce:transition-none"
        >
          <div
            v-if="game.new"
            class="absolute right-0 top-0 rounded-bl-xl bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-sm"
          >
            {{ game.cornerLabel ?? copy.common.beta }}
          </div>
          <CardHeader>
            <CardTitle class="flex items-center gap-3 text-2xl">
              <img :src="game.icon" alt="" width="32" height="32" class="h-8 w-8 transition-transform group-hover:scale-110 motion-reduce:transition-none" />
              <h3>{{ game.name }}</h3>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p class="mb-4 text-muted-foreground">{{ game.description }}</p>
            <Badge
              :variant="game.available ? 'default' : 'secondary'"
              :class="game.available ? 'bg-green-600 hover:bg-green-700' : ''"
            >
              {{ game.statusLabel ?? (game.available ? copy.common.available : copy.common.comingSoon) }}
            </Badge>
            <NuxtLink
              v-if="game.href"
              :to="game.href"
              class="ml-4 inline-flex min-h-11 items-center text-sm font-bold text-orange-400 hover:text-orange-300"
            >
              {{ copy.home.gameLink(game.name) }}
            </NuxtLink>
          </CardContent>
        </Card>
      </div>
    </section>

    <!-- Build Battle best of the week (client-only, hidden when empty) -->
    <BuildBestOfStrip variant="home" />

    <!-- Screenshot gallery -->
    <section aria-labelledby="gallery-title">
      <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="gallery-title" class="text-3xl font-black tracking-tight text-white md:text-4xl">{{ copy.home.galleryTitle }}</h2>
          <p class="mt-3 max-w-2xl text-zinc-400">{{ copy.home.galleryIntro }}</p>
        </div>
        <NuxtLink :to="localizePath('/maps')" class="inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">
          {{ copy.home.galleryAll }} →
        </NuxtLink>
      </div>
      <ul class="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <li v-for="shot in gallery" :key="shot.slug">
          <NuxtLink :to="localizePath(`/maps/${shot.slug}`)" class="group block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
            <img
              :src="shot.image"
              :alt="shot.alt"
              width="1200"
              height="900"
              loading="lazy"
              decoding="async"
              sizes="(min-width: 768px) 33vw, 50vw"
              class="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            <span class="block px-3 py-2 text-sm font-bold text-zinc-200">{{ shot.game }} · {{ shot.name }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section id="mobile-app" class="scroll-mt-24 overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-950/30 p-8 shadow-xl md:p-12">
      <div class="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <Badge class="mb-4 bg-orange-600 hover:bg-orange-600">{{ copy.home.mobileBadge }}</Badge>
          <h2 class="text-3xl font-black tracking-tight text-white md:text-4xl">{{ copy.home.mobileTitle }}</h2>
          <p class="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-300">
            {{ copy.home.mobileBody }}
          </p>
          <div class="mt-7">
            <AppStoreButtons />
          </div>
        </div>
        <div class="rounded-2xl border border-zinc-800 bg-black/30 p-6">
          <h3 class="text-xl font-bold text-white">{{ copy.home.actionTitle }}</h3>
          <p class="mt-3 text-zinc-400">
            {{ copy.home.actionBody }}
          </p>
          <Button as-child variant="outline" class="mt-6 border-orange-500/40 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20">
            <NuxtLink :to="localizePath('/updates')">{{ copy.home.allUpdates }}</NuxtLink>
          </Button>
        </div>
      </div>
    </section>

    <section aria-labelledby="shop-promo-title" class="flex flex-col gap-6 rounded-2xl border border-emerald-300/30 bg-gradient-to-r from-zinc-900 to-emerald-950/30 p-6 md:flex-row md:items-center md:justify-between md:p-8">
      <div class="max-w-2xl">
        <p class="text-sm font-bold uppercase tracking-wider text-emerald-300">{{ copy.home.shopBadge }}</p>
        <h2 id="shop-promo-title" class="mt-2 text-2xl font-black text-white">{{ copy.home.shopTitle }}</h2>
        <p class="mt-3 text-zinc-400">{{ copy.home.shopBody }}</p>
      </div>
      <NuxtLink :to="localizePath('/shop')" @click="shopAnalytics.track('free_effect_click', { source: 'home' }); siteAnalytics.track('shop_entry')" class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-emerald-300 px-5 py-3 font-black text-zinc-950 hover:bg-emerald-200">{{ copy.home.shopCta }}</NuxtLink>
    </section>

    <section v-if="latestUpdates.length" aria-labelledby="latest-updates-title">
      <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge class="mb-3 bg-orange-600 hover:bg-orange-600">{{ copy.home.latestBadge }}</Badge>
          <h2 id="latest-updates-title" class="text-3xl font-black tracking-tight text-white md:text-4xl">{{ copy.home.latestTitle }}</h2>
          <p class="mt-3 max-w-2xl text-zinc-400">{{ copy.home.latestIntro }}</p>
        </div>
        <NuxtLink :to="localizePath('/updates')" class="inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">
          {{ copy.home.latestAll }}
        </NuxtLink>
      </div>
      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <UpdatePostCard v-for="post in latestUpdates" :key="post.id" :post="post" compact heading-level="h3" />
      </div>
    </section>

    <!-- Features Grid -->
    <section>
      <div class="grid gap-8 md:grid-cols-3">
        <Card
          v-for="feature in features"
          :key="feature.title"
          class="border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <CardHeader>
            <CardTitle class="flex items-center gap-3 text-xl">
              <div class="rounded-lg bg-secondary p-2">
                <img :src="feature.icon" alt="" width="24" height="24" class="h-6 w-6" />
              </div>
              <h3>{{ feature.title }}</h3>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-muted-foreground">{{ feature.description }}</p>
          </CardContent>
        </Card>
      </div>
    </section>

    <!-- Legacy / History Section -->
    <section class="text-center" aria-labelledby="history-title">
      <div class="mx-auto max-w-4xl border-t border-zinc-800 pt-16 mt-10">
        <h2 id="history-title" class="mb-6 text-2xl font-bold text-white">
          {{ copy.home.history }}
        </h2>
        <p class="mb-8 text-lg text-zinc-400 leading-relaxed">
          {{ copy.home.historyBody }}
        </p>
        <dl class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="rounded-xl bg-zinc-900 p-4 border border-zinc-800">
            <dt class="text-zinc-500 text-[10px] font-bold uppercase mb-1">{{ copy.home.launched }}</dt>
            <dd class="text-xl font-bold text-white">2014</dd>
          </div>
          <div class="rounded-xl bg-zinc-900 p-4 border border-zinc-800">
            <dt class="text-zinc-500 text-[10px] font-bold uppercase mb-1">{{ copy.home.peakScale }}</dt>
            <dd class="text-xl font-bold text-white">{{ peakPlayers }}+ {{ copy.home.players }}</dd>
          </div>
          <div class="rounded-xl bg-zinc-900 p-4 border border-zinc-800">
            <dt class="text-zinc-500 text-[10px] font-bold uppercase mb-1">{{ copy.home.projectStatus }}</dt>
            <dd class="text-xl font-bold text-white">{{ copy.home.active }}</dd>
          </div>
        </dl>
        <NuxtLink :to="localizePath('/history')" class="mt-8 inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">
          {{ copy.home.historyLink }} →
        </NuxtLink>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="mx-auto max-w-4xl" aria-labelledby="faq-title">
      <h2 id="faq-title" class="mb-10 text-center text-3xl font-bold tracking-tight md:text-4xl text-foreground">
        {{ copy.home.faqTitle }}
      </h2>
      <div class="grid gap-6 md:grid-cols-2">
        <div v-for="(faq, index) in faqs" :key="index" class="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 class="mb-3 text-lg font-bold text-foreground">{{ faq.question }}</h3>
          <p class="text-muted-foreground">{{ faq.answer }}</p>
          <NuxtLink v-if="index === 0" :to="localizePath('/join')" class="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-orange-400 hover:text-orange-300">
            {{ copy.home.joinGuidesLink }} →
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- About Section -->
    <section class="rounded-3xl bg-secondary/30 p-8 md:p-12" aria-labelledby="about-title">
      <h2 id="about-title" class="mb-6 text-3xl font-bold tracking-tight text-foreground">{{ copy.home.aboutTitle }}</h2>
      <div class="max-w-3xl space-y-4 text-muted-foreground">
        <p v-for="paragraph in copy.home.aboutBody" :key="paragraph">{{ paragraph }}</p>
      </div>
      <div class="mt-8 flex flex-wrap gap-4">
        <a :href="DISCORD_INVITE_URL" target="_blank" rel="noopener" class="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-indigo-300 hover:text-indigo-200">
          {{ copy.home.joinDiscord }}
        </a>
        <a :href="X_PROFILE_URL" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300">
          {{ copy.home.followX }}
        </a>
        <a :href="GITHUB_PROFILE_URL" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-200">
          {{ copy.home.viewGithub }}
        </a>
      </div>
    </section>
  </div>
</template>

<script setup>
import PlayerCounter from "@/components/PlayerCounter.vue";
import JoinAddress from "@/components/JoinAddress.vue";
import UpdatePostCard from "@/components/UpdatePostCard.vue";
import BuildBestOfStrip from "@/components/BuildBestOfStrip.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Gamepad2, Mic, X } from "@lucide/vue";
import { onMounted, ref, watch } from "vue";
import { fatKingPreviewCopy } from "@/utils/fat-king-preview";
import { nomadPreviewCopy } from "@/utils/nomad-preview";
import { mapCatalog } from "@/utils/map-catalog";
import { featuredEvent } from "@/utils/updates";
import { COOKIE_BUILD_SITE_URL } from "@/utils/game-landings";
import { localizedAbsoluteUrl } from "@/utils/site-locales";
import {
  BEDROCK_ADD_SERVER_URL,
  BEDROCK_PORT,
  DISCORD_INVITE_URL,
  GITHUB_PROFILE_URL,
  SERVER_ADDRESS,
  SOCIAL_PROFILE_URLS,
  X_PROFILE_URL,
} from "@/utils/site-links";

definePageMeta({ alias: ["/fr", "/de", "/it", "/bg", "/es", "/hi", "/pt-br"] });

const showJoinGuide = ref(false);
const selectedEdition = ref("java");
const shopAnalytics = useShopAnalytics();
const siteAnalytics = useSiteAnalytics();
const { copyToClipboard } = useCopyToast();
const { locale, copy, localizePath } = useSiteLocale();
const editions = computed(() => [
  { id: "java", label: "Java" },
  { id: "bedrock", label: "Bedrock" },
  { id: "console", label: copy.value.home.consoleEdition },
]);
const consoles = [
  { path: "/join/playstation", label: "PlayStation" },
  { path: "/join/xbox", label: "Xbox" },
  { path: "/join/switch", label: "Nintendo Switch" },
];

const { canonicalUrl } = useLocalizedSeo(
  "/",
  computed(() => copy.value.home.title),
  computed(() => copy.value.home.description),
);

onMounted(() => {
  const remembered = window.localStorage.getItem("cookiebuild-minecraft-edition");
  if (remembered === "java" || remembered === "bedrock" || remembered === "console") {
    selectedEdition.value = remembered;
    return;
  }
  if (window.matchMedia("(max-width: 767px)").matches) {
    selectedEdition.value = "bedrock";
  }
});

watch(selectedEdition, (edition) => {
  if (import.meta.client) {
    window.localStorage.setItem("cookiebuild-minecraft-edition", edition);
  }
});

const { data: updatesData } = await useFetch("/api/mobile/v1/news", {
  query: { limit: 3 },
});
const latestUpdates = computed(() => updatesData.value?.data ?? []);
const { data: bootstrapData } = await useFetch("/api/mobile/v1/bootstrap");
const bedWarsAvailable = computed(() => bootstrapData.value?.data?.gamemodes
  ?.some((game) => game.id === "bedwars" && game.available) ?? false);
// Next community session (e.g. the recurring Soirée Cookie), localized for the page.
const { data: eventsData } = await useFetch("/api/mobile/v1/events", {
  query: computed(() => ({ limit: 10, locale: locale.value.code })),
});
const nextEvent = computed(() => featuredEvent(eventsData.value?.data ?? []));

const peakPlayers = computed(() => new Intl.NumberFormat(locale.value.htmlLang).format(2000));

const featureIcons = ["/unique-games-icon.svg", "/community-icon.svg", "/java-support-icon.svg"];
const features = computed(() => copy.value.home.features.map((feature, index) => ({
  ...feature,
  icon: featureIcons[index],
})));

const gallerySlugs = ["fat-king-crown", "nomad-oasis", "bedwars-cookie-colosseum-v1", "skywars-legacy-1", "microbattles-game-1", "pitchout-frozen"];
const gallery = computed(() => gallerySlugs
  .map((slug) => mapCatalog.find((map) => map.slug === slug))
  .filter(Boolean)
  .map((map) => ({
    slug: map.slug,
    name: map.name,
    game: map.game,
    image: map.image,
    alt: copy.value.home.galleryAlt.replace("{game}", map.game).replace("{name}", map.name),
  })));

const minigames = computed(() => [
  {
    name: "Fat King",
    description: fatKingPreviewCopy[locale.value.code].intro,
    available: true,
    statusLabel: copy.value.common.available,
    icon: "/unique-games-icon.svg",
    new: true,
    cornerLabel: copy.value.common.beta,
    href: localizePath("/fat-king"),
  },
  {
    name: "Nomad Wars",
    description: nomadPreviewCopy[locale.value.code].intro,
    available: true,
    statusLabel: copy.value.common.available,
    icon: "/skywars-icon.svg",
    new: true,
    cornerLabel: copy.value.common.beta,
    href: localizePath("/nomad-wars"),
  },
  {
    name: "BedWars",
    description: copy.value.home.games.bedwars.description,
    available: bedWarsAvailable.value,
    statusLabel: bedWarsAvailable.value ? copy.value.home.games.bedwars.status : copy.value.common.comingSoon,
    icon: "/bedwars-icon.svg",
    new: true,
    cornerLabel: copy.value.common.beta,
    href: localizePath("/bedwars"),
  },
  {
    name: "Skyblock",
    description: copy.value.home.games.skyblock.description,
    available: true,
    statusLabel: copy.value.home.games.skyblock.status,
    icon: "/skyblock-icon.svg",
    new: true,
    cornerLabel: copy.value.common.beta,
    href: localizePath("/skyblock"),
  },
  {
    name: "MicroBattles",
    description: copy.value.home.games.microbattles.description,
    available: true,
    icon: "/microbattles-icon.svg",
    href: localizePath("/microbattles"),
  },
  {
    name: "Pitchout",
    description: copy.value.home.games.pitchout.description,
    available: true,
    icon: "/pitchout-icon.svg",
    href: localizePath("/pitchout"),
  },
  {
    name: "Build Battles",
    description: copy.value.home.games["build-battle"].description,
    available: true,
    icon: "/buildbattle-icon.svg",
    href: localizePath("/build-battle"),
  },
  {
    name: "SkyWars",
    description: copy.value.home.games.skywars.description,
    available: true,
    icon: "/skywars-icon.svg",
    href: localizePath("/skywars"),
  },
  {
    name: "TurfWars",
    description: copy.value.home.games.turfwars.description,
    available: true,
    icon: "/turfwars-icon.svg",
    href: localizePath("/turfwars"),
  },
]);

const faqs = computed(() => copy.value.home.faqs);

const copyText = async (value, label) => {
  await copyToClipboard(value, label);
  if (value === SERVER_ADDRESS) siteAnalytics.track("server_address_copy");
};

const organizationId = `${COOKIE_BUILD_SITE_URL}/#organization`;

useHead(() => ({
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": organizationId,
            name: "Cookie Build",
            url: `${COOKIE_BUILD_SITE_URL}/`,
            logo: {
              "@type": "ImageObject",
              url: `${COOKIE_BUILD_SITE_URL}/android-chrome-512x512.png`,
              width: 512,
              height: 512,
            },
            foundingDate: "2014",
            email: "support@cookie-build.com",
            sameAs: [...SOCIAL_PROFILE_URLS],
          },
          {
            "@type": "WebSite",
            "@id": `${COOKIE_BUILD_SITE_URL}/#website`,
            name: "Cookie Build",
            url: localizedAbsoluteUrl("/", locale.value),
            inLanguage: locale.value.htmlLang,
            publisher: { "@id": organizationId },
          },
          {
            "@type": "VideoGame",
            name: "Cookie Build",
            description: copy.value.home.description,
            inLanguage: locale.value.htmlLang,
            genre: ["Multiplayer", "Mini-games", "Action"],
            gamePlatform: ["PC", "Mobile", "Console"],
            applicationCategory: "Game",
            operatingSystem: "Windows, macOS, Linux, iOS, Android, Xbox, PlayStation, Switch",
            url: canonicalUrl.value,
            image: `${COOKIE_BUILD_SITE_URL}/lobby-hero-clean-1600.webp`,
            author: { "@id": organizationId },
            publisher: { "@id": organizationId },
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
              category: "Free",
            },
          },
          {
            "@type": "FAQPage",
            inLanguage: locale.value.htmlLang,
            mainEntity: faqs.value.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: f.answer,
              },
            })),
          },
        ],
      }),
    },
  ],
}));
</script>
