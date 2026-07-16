<template>
  <div class="mx-auto max-w-5xl space-y-10">
    <section class="overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-950/40 p-7 shadow-2xl sm:p-10 md:p-12">
      <Badge class="mb-4 bg-orange-600 hover:bg-orange-600">Cookie Build updates</Badge>
      <h1 class="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">What’s happening</h1>
      <p class="mt-5 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
        Community news, upcoming play sessions and release notes — one live feed shared with the Cookie Build app.
      </p>
    </section>

    <section
      v-if="nextEvent"
      aria-labelledby="next-event-title"
      class="overflow-hidden rounded-3xl border border-emerald-500/25 bg-emerald-950/20 p-6 shadow-xl sm:p-8"
    >
      <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-3xl">
          <Badge class="mb-3 bg-emerald-600 hover:bg-emerald-600">
            {{ nextEventIsLive ? "Live now" : "Next community session" }}
          </Badge>
          <h2 id="next-event-title" class="text-2xl font-black text-white sm:text-3xl">{{ nextEvent.title }}</h2>
          <div class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-emerald-100/90">
            <time :datetime="eventDateTime(nextEvent.startsAt)" class="inline-flex items-center gap-2">
              <CalendarDays class="h-4 w-4" aria-hidden="true" />
              {{ eventDate(nextEvent.startsAt) }}
            </time>
            <span v-if="nextEvent.gameType" class="inline-flex items-center gap-2">
              <Gamepad2 class="h-4 w-4" aria-hidden="true" />
              {{ nextEvent.gameType }}
            </span>
          </div>
          <p class="mt-4 line-clamp-3 leading-relaxed text-zinc-300">{{ nextEvent.description }}</p>
        </div>
        <div class="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          <Button as-child class="bg-emerald-600 font-bold hover:bg-emerald-700">
            <a href="https://discord.gg/ajmPnwh9g8" target="_blank" rel="noopener noreferrer">
              Join us on Discord
              <ExternalLink class="ml-2 h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
          <NuxtLink to="/#mobile-app" class="inline-flex min-h-11 items-center justify-center px-3 text-sm font-bold text-zinc-300 hover:text-white">
            Get app reminders
          </NuxtLink>
        </div>
      </div>
    </section>

    <section aria-labelledby="updates-feed-title">
      <div class="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="updates-feed-title" class="text-3xl font-black tracking-tight text-white">Latest updates</h2>
          <p class="mt-2 text-zinc-400">Announcements and player-facing changes, newest first.</p>
        </div>
        <div class="flex flex-wrap gap-2" aria-label="Filter updates">
          <button
            v-for="option in filters"
            :key="option.value"
            type="button"
            class="min-h-11 rounded-full border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            :class="activeFilter === option.value ? 'border-orange-500 bg-orange-600 text-white' : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-white'"
            :aria-pressed="activeFilter === option.value"
            @click="activeFilter = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div aria-live="polite">
        <div v-if="pending" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">
          Loading updates…
        </div>
        <div v-else-if="error" class="rounded-2xl border border-red-900/60 bg-red-950/30 p-8 text-red-200">
          Updates are temporarily unavailable. Please try again shortly.
        </div>
        <div v-else-if="!filteredPosts.length" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">
          No {{ activeFilter === "all" ? "public updates have" : activeFilter === "news" ? "news has" : "release notes have" }} been posted yet.
        </div>
        <div v-else class="space-y-8">
          <UpdatePostCard v-for="post in filteredPosts" :key="post.id" :post="post" />
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-zinc-800 bg-zinc-900 p-7 sm:p-9">
      <h2 class="text-2xl font-black text-white">Take the network with you</h2>
      <p class="mb-6 mt-3 max-w-2xl text-zinc-400">
        Follow live status, events, Friends and Parties, and opt in when a game needs more players.
      </p>
      <AppStoreButtons />
    </section>
  </div>
</template>

<script setup lang="ts">
import { CalendarDays, ExternalLink, Gamepad2 } from "@lucide/vue";
import UpdatePostCard from "@/components/UpdatePostCard.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import { Button } from "@/components/ui/button";
import {
  eventDate,
  eventDateTime,
  featuredEvent,
  isEventLive,
  type NetworkEvent,
  type UpdateContentType,
  type UpdatePost,
} from "@/utils/updates";

interface UpdatesResponse {
  data: UpdatePost[];
}

interface EventsResponse {
  data: NetworkEvent[];
}

type UpdateFilter = "all" | UpdateContentType;

const filters: Array<{ value: UpdateFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "news", label: "News" },
  { value: "changelog", label: "Release notes" },
];
const activeFilter = ref<UpdateFilter>("all");

const { data, pending, error } = await useFetch<UpdatesResponse>("/api/mobile/v1/news", {
  query: { limit: 50 },
});
const { data: eventsData } = await useFetch<EventsResponse>("/api/mobile/v1/events", {
  query: { limit: 20 },
});

const posts = computed(() => data.value?.data ?? []);
const filteredPosts = computed(() => activeFilter.value === "all"
  ? posts.value
  : posts.value.filter((post) => post.contentType === activeFilter.value));
const nextEvent = computed(() => featuredEvent(eventsData.value?.data ?? []));
const nextEventIsLive = computed(() => nextEvent.value ? isEventLive(nextEvent.value) : false);

useSeoMeta({
  title: "Updates & Events | Cookie Build",
  description: "See the latest Cookie Build Minecraft news, upcoming community sessions and release notes in one place.",
  ogTitle: "What’s Happening on Cookie Build",
  ogDescription: "Cookie Build news, community play sessions and player-facing updates for Java and Bedrock.",
  ogImage: "https://www.cookie-build.com/cookie-build-social.webp",
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: "Cookie Build Minecraft lobby",
  twitterImage: "https://www.cookie-build.com/cookie-build-social.webp",
  twitterImageAlt: "Cookie Build Minecraft lobby",
  ogType: "website",
});

useHead({
  link: [{ rel: "canonical", href: "https://www.cookie-build.com/updates" }],
});
</script>
