<template>
  <div class="mx-auto max-w-5xl space-y-10">
    <section class="overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-950/40 p-7 shadow-2xl sm:p-10 md:p-12">
      <Badge class="mb-4 bg-orange-600 hover:bg-orange-600">From the network</Badge>
      <h1 class="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">Network news</h1>
      <p class="mt-5 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
        Announcements, community highlights and everything happening across Cookie Build — published from the same feed as the mobile app.
      </p>
    </section>

    <div aria-live="polite">
      <div v-if="pending" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">
        Loading network news…
      </div>
      <div v-else-if="error" class="rounded-2xl border border-red-900/60 bg-red-950/30 p-8 text-red-200">
        Network news is temporarily unavailable. Please try again shortly.
      </div>
      <div v-else-if="!posts.length" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-300 sm:p-10">
        <h2 class="text-xl font-black text-white">No network news has been published yet.</h2>
        <p class="mt-3 text-zinc-400">Release notes remain available in the changelog.</p>
        <NuxtLink to="/changelog" class="mt-5 inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">
          Browse the changelog
        </NuxtLink>
      </div>
      <div v-else class="space-y-8">
        <NewsPostCard v-for="post in posts" :key="post.id" :post="post" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NewsPostCard from "@/components/NewsPostCard.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import type { NewsPost } from "@/utils/news";

interface NewsResponse {
  data: NewsPost[];
}

const { data, pending, error } = await useFetch<NewsResponse>("/api/mobile/v1/news", {
  query: { limit: 50, contentType: "news" },
});
const posts = computed(() => data.value?.data ?? []);

useSeoMeta({
  title: "Network News | Cookie Build",
  description: "Read the latest Cookie Build network announcements and community news, from the same live feed as the mobile app.",
  ogTitle: "Cookie Build Network News",
  ogDescription: "Announcements, community highlights and everything happening across the Cookie Build Minecraft network.",
  ogImage: "https://www.cookie-build.com/lobby.webp",
  ogType: "website",
});

useHead({
  link: [{ rel: "canonical", href: "https://www.cookie-build.com/news" }],
});
</script>
