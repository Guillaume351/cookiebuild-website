<template>
  <div class="space-y-12">
    <nav :aria-label="guide.ui.breadcrumbLabel" class="text-sm">
      <ol class="flex flex-wrap items-center gap-1 text-zinc-400">
        <li class="flex items-center gap-1">
          <NuxtLink :to="localizePath('/')" class="inline-flex min-h-11 items-center font-semibold hover:text-orange-300">
            {{ guide.ui.home }}
          </NuxtLink>
          <ChevronRight class="h-4 w-4 text-zinc-600" aria-hidden="true" />
        </li>
        <li>
          <span aria-current="page" class="inline-flex min-h-11 items-center font-semibold text-white">{{ guide.ui.join }}</span>
        </li>
      </ol>
    </nav>

    <header class="mx-auto max-w-4xl text-center">
      <p class="text-sm font-black uppercase tracking-widest text-orange-400">{{ guide.hub.eyebrow }}</p>
      <h1 class="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">{{ guide.hub.h1 }}</h1>
      <p class="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-zinc-300 md:text-xl">{{ guide.hub.intro }}</p>
    </header>

    <section aria-labelledby="join-address-title" class="mx-auto max-w-3xl rounded-3xl border border-orange-500/20 bg-zinc-950 p-6 shadow-xl md:p-8">
      <h2 id="join-address-title" class="text-2xl font-black tracking-tight text-white">{{ guide.hub.addressHeading }}</h2>
      <p class="mt-3 leading-relaxed text-zinc-400">{{ guide.hub.addressBody }}</p>
      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <JoinAddress :address="serverIP" :label="copy.common.serverAddress" @copy="copyToClipboard(serverIP, copy.common.serverAddress)" />
        <JoinAddress :address="bedrockPort" :label="copy.common.bedrockPort" @copy="copyToClipboard(bedrockPort, copy.common.bedrockPort)" />
      </div>
    </section>

    <section aria-labelledby="join-platforms-title">
      <h2 id="join-platforms-title" class="text-center text-3xl font-black tracking-tight text-white md:text-4xl">
        {{ guide.hub.platformsHeading }}
      </h2>
      <ul class="mt-9 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <li v-for="platform in platforms" :key="platform.id">
          <NuxtLink
            :to="platform.path"
            class="group flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-7 transition hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-xl"
          >
            <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600/15 text-orange-400">
              <component :is="platform.icon" class="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 class="mt-5 text-2xl font-black text-white">{{ platform.cardTitle }}</h3>
            <p class="mt-3 flex-1 leading-relaxed text-zinc-400">{{ platform.cardDescription }}</p>
            <span class="mt-5 inline-flex min-h-11 items-center gap-2 font-bold text-orange-400 group-hover:text-orange-300">
              {{ guide.hub.cardCta }}
              <ArrowRight class="h-4 w-4" aria-hidden="true" />
            </span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section aria-labelledby="join-help-title" class="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-950/40 via-zinc-950 to-zinc-950 p-8 md:p-12">
      <div class="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <h2 id="join-help-title" class="text-3xl font-black tracking-tight text-white">{{ guide.ui.helpHeading }}</h2>
          <p class="mt-4 max-w-3xl text-lg leading-relaxed text-zinc-300">{{ guide.ui.helpBody }}</p>
        </div>
        <a
          :href="DISCORD_INVITE_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 font-bold text-white hover:bg-orange-700"
        >
          <MessageCircle class="h-5 w-5" aria-hidden="true" />
          {{ guide.ui.discordCta }}
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, ChevronRight, Gamepad2, MessageCircle, Monitor, Smartphone } from "@lucide/vue";
import JoinAddress from "@/components/JoinAddress.vue";
import { COOKIE_BUILD_BEDROCK_PORT, COOKIE_BUILD_SERVER_IP } from "@/utils/game-landings";
import { JOIN_GUIDE_COPY, JOIN_PLATFORMS, type JoinPlatformId } from "@/utils/join-guide-copy";
import { DISCORD_INVITE_URL } from "@/utils/site-links";
import { localizedAbsoluteUrl } from "@/utils/site-locales";

definePageMeta({ alias: ["/fr/rejoindre", "/de/join", "/it/join", "/bg/join", "/es/join", "/hi/join", "/pt-br/join"] });

const serverIP = COOKIE_BUILD_SERVER_IP;
const bedrockPort = COOKIE_BUILD_BEDROCK_PORT;

const { locale, copy, localizePath } = useSiteLocale();
const { copyToClipboard } = useCopyToast();
const guide = computed(() => JOIN_GUIDE_COPY[locale.value.code]);

const PLATFORM_ICONS: Record<JoinPlatformId, typeof Gamepad2> = {
  playstation: Gamepad2,
  xbox: Gamepad2,
  switch: Gamepad2,
  mobile: Smartphone,
  java: Monitor,
};

const platforms = computed(() =>
  JOIN_PLATFORMS.map((id) => ({
    id,
    icon: PLATFORM_ICONS[id],
    path: localizePath(`/join/${id}`),
    cardTitle: guide.value.platforms[id].cardTitle,
    cardDescription: guide.value.platforms[id].cardDescription,
  })),
);

useLocalizedSeo(
  "/join",
  () => guide.value.hub.seoTitle,
  () => guide.value.hub.metaDescription,
);

useHead(() => ({
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            name: guide.value.hub.h1,
            description: guide.value.hub.metaDescription,
            inLanguage: locale.value.htmlLang,
            url: localizedAbsoluteUrl("/join", locale.value),
            mainEntity: {
              "@type": "ItemList",
              itemListElement: JOIN_PLATFORMS.map((id, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: guide.value.platforms[id].h1,
                url: localizedAbsoluteUrl(`/join/${id}`, locale.value),
              })),
            },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: guide.value.ui.home, item: localizedAbsoluteUrl("/", locale.value) },
              { "@type": "ListItem", position: 2, name: guide.value.ui.join, item: localizedAbsoluteUrl("/join", locale.value) },
            ],
          },
        ],
      }),
    },
  ],
}));
</script>
