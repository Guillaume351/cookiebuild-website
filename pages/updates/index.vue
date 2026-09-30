<template>
  <div class="mx-auto max-w-5xl space-y-10">
    <section class="overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-950/40 p-7 shadow-2xl sm:p-10 md:p-12">
      <Badge class="mb-4 bg-orange-600 hover:bg-orange-600">{{ updates.badge }}</Badge>
      <h1 class="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">{{ updates.title }}</h1>
      <p class="mt-5 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
        {{ updates.intro }}
      </p>
    </section>

    <NuxtLink v-if="currentPage === 1" :to="localizePath('/updates/fat-king-preview')" class="block overflow-hidden rounded-3xl border border-amber-500/30 bg-zinc-900 p-7 transition hover:border-amber-400 sm:p-10">
      <p class="font-bold uppercase tracking-wider text-amber-400">{{ fatCopy.badge }}</p>
      <h2 class="mt-3 text-4xl font-black text-white">{{ fatCopy.articleTitle }}</h2>
      <p class="mt-4 max-w-2xl text-lg text-zinc-300">{{ fatCopy.intro }}</p>
      <span class="mt-5 inline-flex min-h-11 items-center font-bold text-amber-300">{{ miniUi.discover }} →</span>
    </NuxtLink>
    <NuxtLink v-if="currentPage === 1" :to="localizePath('/updates/nomad-wars-preview')" class="block rounded-3xl border border-orange-500/30 bg-zinc-900 p-7 transition hover:border-orange-400">
      <p class="text-sm font-bold uppercase tracking-wider text-orange-400">{{ fatCopy.badge }}</p>
      <h2 class="mt-3 text-3xl font-black text-white">{{ `Nomad Wars — ${miniUi.beta}` }}</h2>
      <p class="mt-4 text-zinc-300">{{ nomadCopy.intro }}</p>
      <span class="mt-4 inline-flex min-h-11 items-center font-bold text-orange-300">{{ miniUi.rules }} →</span>
    </NuxtLink>
    <section
      v-if="nextEvent && currentPage === 1"
      aria-labelledby="next-event-title"
      class="overflow-hidden rounded-3xl border border-emerald-500/25 bg-emerald-950/20 p-6 shadow-xl sm:p-8"
    >
      <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-3xl">
          <Badge class="mb-3 bg-emerald-600 hover:bg-emerald-600">
            {{ nextEventIsLive ? updates.live : updates.next }}
          </Badge>
          <h2 id="next-event-title" class="text-2xl font-black text-white sm:text-3xl">{{ nextEvent.title }}</h2>
          <div class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-emerald-100/90">
            <time :datetime="eventDateTime(nextEvent.startsAt)" class="inline-flex items-center gap-2">
              <CalendarDays class="h-4 w-4" aria-hidden="true" />
              {{ eventDate(nextEvent.startsAt, locale.htmlLang) }}
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
            <a :href="DISCORD_INVITE_URL" target="_blank" rel="noopener">
              {{ updates.discord }}
              <ExternalLink class="ml-2 h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
          <NuxtLink :to="`${localizePath('/')}#mobile-app`" class="inline-flex min-h-11 items-center justify-center px-3 text-sm font-bold text-zinc-300 hover:text-white">
            {{ updates.reminders }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <section aria-labelledby="updates-feed-title">
      <div class="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="updates-feed-title" class="text-3xl font-black tracking-tight text-white">{{ updates.latest }}</h2>
          <p class="mt-2 text-zinc-400">{{ updates.latestIntro }}</p>
        </div>
        <nav class="flex flex-wrap gap-2" :aria-label="updates.filter">
          <NuxtLink
            v-for="option in filters"
            :key="option.value"
            :to="listLink(1, option.value)"
            class="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            :class="activeFilter === option.value ? 'border-orange-500 bg-orange-600 text-white' : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-white'"
            :aria-current="activeFilter === option.value ? 'page' : undefined"
          >
            {{ option.label }}
          </NuxtLink>
        </nav>
      </div>

      <div aria-live="polite">
        <div v-if="pending" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">
          {{ updates.loading }}
        </div>
        <div v-else-if="error" class="rounded-2xl border border-red-900/60 bg-red-950/30 p-8 text-red-200">
          {{ updates.error }}
        </div>
        <div v-else-if="!filteredPosts.length" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">
          {{ updates.empty }}
        </div>
        <div v-else class="grid gap-6 md:grid-cols-2">
          <UpdatePostCard v-for="post in pagePosts" :key="post.id" :post="post" compact />
        </div>
      </div>

      <nav v-if="pageCount > 1" class="mt-10 flex flex-wrap items-center justify-between gap-4" :aria-label="updates.pagination">
        <NuxtLink
          v-if="currentPage > 1"
          :to="listLink(currentPage - 1, activeFilter)"
          rel="prev"
          class="inline-flex min-h-11 items-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 font-bold text-zinc-200 hover:border-orange-400 hover:text-white"
        >
          ← {{ updates.previous }}
        </NuxtLink>
        <span v-else></span>
        <ol class="flex flex-wrap gap-2">
          <li v-for="number in pageCount" :key="number">
            <NuxtLink
              :to="listLink(number, activeFilter)"
              class="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 font-bold"
              :class="number === currentPage ? 'border-orange-500 bg-orange-600 text-white' : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-white'"
              :aria-current="number === currentPage ? 'page' : undefined"
              :aria-label="updates.pageLabel.replace('{page}', String(number))"
            >
              {{ number }}
            </NuxtLink>
          </li>
        </ol>
        <NuxtLink
          v-if="currentPage < pageCount"
          :to="listLink(currentPage + 1, activeFilter)"
          rel="next"
          class="inline-flex min-h-11 items-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 font-bold text-zinc-200 hover:border-orange-400 hover:text-white"
        >
          {{ updates.nextPage }} →
        </NuxtLink>
      </nav>
    </section>

    <section class="rounded-3xl border border-zinc-800 bg-zinc-900 p-7 sm:p-9">
      <h2 class="text-2xl font-black text-white">{{ updates.appTitle }}</h2>
      <p class="mb-6 mt-3 max-w-2xl text-zinc-400">
        {{ updates.appIntro }}
      </p>
      <AppStoreButtons />
    </section>
  </div>
</template>

<script setup lang="ts">
import { nomadPreviewCopy } from "@/utils/nomad-preview";
import { fatKingPreviewCopy } from "@/utils/fat-king-preview";
import { gameUiCopy } from "@/utils/game-ui-copy";
import { updatesCopy } from "@/utils/updates-copy";
import { fetchAllNews } from "@/utils/all-news";
import { publicPageSeo } from "@/utils/public-page-seo";
import { COOKIE_BUILD_SITE_URL } from "@/utils/game-landings";
import { DISCORD_INVITE_URL } from "@/utils/site-links";

definePageMeta({ alias: ["/fr/updates", "/de/updates", "/it/updates", "/bg/updates", "/es/updates", "/hi/updates", "/pt-br/updates"] });

import { CalendarDays, ExternalLink, Gamepad2 } from "@lucide/vue";
import UpdatePostCard from "@/components/UpdatePostCard.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import { Button } from "@/components/ui/button";
import {
  UPDATES_PAGE_SIZE,
  eventDate,
  eventDateTime,
  featuredEvent,
  isEventLive,
  paginateUpdates,
  toUpdateListItem,
  updateSlugFromHash,
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

const route = useRoute();
const { locale, localizePath } = useSiteLocale();
const nomadCopy = computed(() => nomadPreviewCopy[locale.value.code]);
const fatCopy = computed(() => fatKingPreviewCopy[locale.value.code]);
const miniUi = computed(() => gameUiCopy[locale.value.code]);
const updates = computed(() => updatesCopy[locale.value.code]);

const filters = computed<Array<{ value: UpdateFilter; label: string }>>(() => [
  { value: "all", label: updates.value.all },
  { value: "news", label: updates.value.news },
  { value: "changelog", label: updates.value.notes },
]);
const activeFilter = computed<UpdateFilter>(() => {
  const type = route.query.type;
  return type === "news" || type === "changelog" ? type : "all";
});
const requestedPage = computed(() => {
  const value = Number.parseInt(String(route.query.page ?? "1"), 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
});

// Only list fields reach the SSR payload: full bodies live on each article page.
const { data, pending, error } = await useAsyncData("updates-list",
  async () => (await fetchAllNews<UpdatesResponse["data"][number]>({ includeSuperseded: "true" }))
    .map(toUpdateListItem));
// Recurring sessions (e.g. Soirée Cookie) come back localized for the page language.
const { data: eventsData } = await useFetch<EventsResponse>("/api/mobile/v1/events", {
  query: computed(() => ({ limit: 20, locale: locale.value.code })),
});

const posts = computed(() => data.value ?? []);
const filteredPosts = computed(() => activeFilter.value === "all"
  ? posts.value
  : posts.value.filter((post) => post.contentType === activeFilter.value));
const pagination = computed(() => paginateUpdates(filteredPosts.value, requestedPage.value, UPDATES_PAGE_SIZE));
const pagePosts = computed(() => pagination.value.items);
const currentPage = computed(() => pagination.value.page);
const pageCount = computed(() => pagination.value.pageCount);
if (!error.value && requestedPage.value > pageCount.value) {
  throw createError({ statusCode: 404, statusMessage: "Updates page not found" });
}
const nextEvent = computed(() => featuredEvent(eventsData.value?.data ?? []));
const nextEventIsLive = computed(() => nextEvent.value ? isEventLive(nextEvent.value) : false);

function listLink(page: number, filter: UpdateFilter) {
  const query: Record<string, string> = {};
  if (filter !== "all") query.type = filter;
  if (page > 1) query.page = String(page);
  return { path: localizePath("/updates"), query };
}

onMounted(async () => {
  const slug = updateSlugFromHash(window.location.hash);
  if (!slug) return;
  await nextTick();
  if (!document.getElementById(`update-${slug}`) && !document.getElementById(`news-${slug}`)) {
    await navigateTo(localizePath(`/updates/${slug}`), { replace: true });
  }
});

const seo = computed(() => publicPageSeo(locale.value.code, "updates"));
const canonicalQuery = computed(() => {
  const params = new URLSearchParams();
  if (activeFilter.value !== "all") params.set("type", activeFilter.value);
  if (currentPage.value > 1) params.set("page", String(currentPage.value));
  return params.toString() || undefined;
});
useLocalizedSeo(
  "/updates",
  () => currentPage.value > 1
    ? seo.value.title.replace(" | ", ` – ${updates.value.pageLabel.replace("{page}", String(currentPage.value))} | `)
    : seo.value.title,
  () => seo.value.description,
  { canonicalQuery },
);
const router = useRouter();
const absoluteListUrl = (page: number) => `${COOKIE_BUILD_SITE_URL}${router.resolve(listLink(page, activeFilter.value)).fullPath}`;
useHead(() => ({
  link: [
    ...(currentPage.value > 1 ? [{ rel: "prev" as const, href: absoluteListUrl(currentPage.value - 1) }] : []),
    ...(currentPage.value < pageCount.value ? [{ rel: "next" as const, href: absoluteListUrl(currentPage.value + 1) }] : []),
  ],
}));
</script>
