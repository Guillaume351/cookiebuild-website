<template>
  <div class="space-y-12">
    <header class="mx-auto max-w-4xl py-10 text-center">
      <Badge class="mb-5 bg-orange-600 hover:bg-orange-600">Java &amp; Bedrock cross-play</Badge>
      <h1 class="text-4xl font-black tracking-tight text-white md:text-6xl">Minecraft mini-games on Cookie Build</h1>
      <p class="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-zinc-300 md:text-xl">
        Explore every Cookie Build mode, learn the rules, and join from Minecraft Bedrock or Java at
        <strong>{{ COOKIE_BUILD_SERVER_IP }}</strong>.
      </p>
    </header>

    <section aria-labelledby="all-games-title">
      <h2 id="all-games-title" class="sr-only">All Cookie Build game modes</h2>
      <div class="grid gap-6 md:grid-cols-2">
        <NuxtLink
          v-for="game in gameLandings"
          :key="game.slug"
          :to="game.path"
          class="group rounded-2xl border border-zinc-800 bg-zinc-900 p-7 transition hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-xl"
        >
          <div class="flex items-start gap-4">
            <img :src="game.icon" :alt="`${game.name} icon`" class="h-12 w-12 transition-transform group-hover:scale-110" />
            <div>
              <h3 class="text-2xl font-black text-white">{{ game.name }}</h3>
              <p class="mt-3 leading-relaxed text-zinc-400">{{ game.cardDescription }}</p>
              <span class="mt-5 inline-flex min-h-11 items-center font-bold text-orange-400 group-hover:text-orange-300">
                View {{ game.name }} server guide &rarr;
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import Badge from "@/components/ui/badge/Badge.vue";
import { COOKIE_BUILD_SERVER_IP, COOKIE_BUILD_SITE_URL, gameLandings } from "@/utils/game-landings";

const canonicalUrl = `${COOKIE_BUILD_SITE_URL}/games`;
const title = "Minecraft Mini-Games for Bedrock & Java | Cookie Build";
const description = "Explore Build Battle, MicroBattles, Pitchout, SkyWars and Turf Wars on Cookie Build's free Minecraft Bedrock and Java server.";

useSeoMeta({
  title,
  description,
  robots: "index, follow",
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: canonicalUrl,
  ogImage: `${COOKIE_BUILD_SITE_URL}/cookie-build-social.webp`,
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: `${COOKIE_BUILD_SITE_URL}/cookie-build-social.webp`,
});

useHead({
  link: [{ rel: "canonical", href: canonicalUrl }],
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Cookie Build Minecraft mini-games",
        itemListElement: gameLandings.map((game, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: game.name,
          url: `${COOKIE_BUILD_SITE_URL}${game.path}`,
        })),
      }),
    },
  ],
});
</script>
