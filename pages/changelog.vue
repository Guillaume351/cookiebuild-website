<template>
  <div class="mx-auto max-w-4xl space-y-10">
    <section class="overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-950/40 p-8 shadow-2xl md:p-12">
      <Badge class="mb-4 bg-orange-600 hover:bg-orange-600">Cookie Build updates</Badge>
      <h1 class="text-4xl font-black tracking-tight text-white md:text-6xl">What’s new</h1>
      <p class="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-300">
        Every player-facing improvement, from returning minigames to app features. In game, Cookie Build shows you the entries published since your previous visit.
      </p>
    </section>

    <div v-if="pending" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">
      Loading updates…
    </div>
    <div v-else-if="error" class="rounded-2xl border border-red-900/60 bg-red-950/30 p-8 text-red-200">
      The changelog is temporarily unavailable. Please try again shortly.
    </div>
    <div v-else-if="!posts.length" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">
      No public update has been posted yet.
    </div>
    <ol v-else class="relative space-y-8 before:absolute before:bottom-4 before:left-[11px] before:top-4 before:w-px before:bg-zinc-800">
      <li v-for="post in posts" :key="post.id" class="relative pl-10">
        <span class="absolute left-0 top-2 h-[23px] w-[23px] rounded-full border-4 border-zinc-950 bg-orange-500 shadow-[0_0_0_1px_rgb(63_63_70)]"></span>
        <article class="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl md:p-8">
          <time class="text-sm font-semibold uppercase tracking-wider text-orange-400" :datetime="post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined">
            {{ changelogDate(post.publishedAt) }}
          </time>
          <h2 class="mt-2 text-2xl font-black text-white md:text-3xl">{{ post.title }}</h2>
          <p class="mt-3 text-lg text-zinc-300">{{ post.summary }}</p>
          <ul class="mt-6 space-y-3 text-zinc-400">
            <li v-for="line in changelogBodyLines(post.body)" :key="line" class="flex gap-3 leading-relaxed">
              <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500"></span>
              <span>{{ line }}</span>
            </li>
          </ul>
        </article>
      </li>
    </ol>

    <section class="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 md:p-10">
      <h2 class="text-2xl font-black text-white">Take the network with you</h2>
      <p class="mb-6 mt-3 max-w-2xl text-zinc-400">
        Follow live status, stats, events, Friends and Parties, and opt in when a game needs more players.
      </p>
      <AppStoreButtons />
    </section>
  </div>
</template>

<script setup lang="ts">
import Badge from "@/components/ui/badge/Badge.vue";
import { changelogBodyLines, changelogDate, type ChangelogPost } from "@/utils/changelog";

interface ChangelogResponse {
  data: ChangelogPost[];
}

const { data, pending, error } = await useFetch<ChangelogResponse>("/api/mobile/v1/news", {
  query: { limit: 50, contentType: "changelog" },
});
const posts = computed(() => data.value?.data ?? []);

useSeoMeta({
  title: "What’s New | Cookie Build",
  description: "Cookie Build 2026 release notes: returning minigames, upgrades to existing games, mobile apps, Friends, Parties, stats, events, and reliability improvements.",
  ogTitle: "What’s New on Cookie Build",
  ogDescription: "See every player-facing Cookie Build update and everything added since your last visit.",
  ogImage: "https://www.cookie-build.com/lobby.webp",
});
</script>
