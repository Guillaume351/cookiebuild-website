<template>
  <div class="space-y-10">
    <section class="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-950/40 via-zinc-950 to-zinc-950 px-6 py-12 md:px-12 md:py-16">
      <div class="max-w-3xl">
        <p class="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-orange-400">
          <img src="/buildbattle-icon.svg" alt="" width="28" height="28" class="h-7 w-7" />
          {{ copy.eyebrow }}
        </p>
        <h1 class="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">
          {{ player ? copy.detail.seeAllFrom(player) : copy.title }}
        </h1>
        <p class="mt-5 text-lg leading-relaxed text-zinc-300">{{ copy.intro }}</p>
        <NuxtLink v-if="player" :to="localizePath('/builds')" class="mt-6 inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">
          ← {{ copy.detail.back }}
        </NuxtLink>
      </div>
    </section>

    <div>
      <div role="tablist" :aria-label="copy.tabsLabel" class="flex gap-2 overflow-x-auto pb-2" @keydown="onTabKeydown">
        <button
          v-for="item in BUILD_GALLERY_TABS"
          :id="`builds-tab-${item}`"
          :key="item"
          :ref="(element) => setTabRef(item, element)"
          type="button"
          role="tab"
          :aria-selected="tab === item"
          aria-controls="builds-panel"
          :tabindex="tab === item ? 0 : -1"
          class="min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 motion-reduce:transition-none"
          :class="tab === item ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'"
          @click="selectTab(item)"
        >
          {{ copy.tabs[item] }}
        </button>
      </div>

      <div id="builds-panel" role="tabpanel" :aria-labelledby="`builds-tab-${tab}`" class="mt-6" :aria-busy="pending">
        <p v-if="pending && !items.length" role="status" class="py-16 text-center text-zinc-400">{{ copy.loading }}</p>
        <div v-else-if="error && !items.length" role="alert" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p class="text-zinc-300">{{ copy.error }}</p>
          <button type="button" class="mt-4 min-h-11 rounded-xl bg-orange-600 px-5 font-bold text-white hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400" @click="refresh()">
            {{ copy.retry }}
          </button>
        </div>
        <div v-else-if="!items.length" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p class="text-zinc-300">{{ copy.empty }}</p>
          <NuxtLink :to="localizePath('/build-battle')" class="mt-4 inline-flex min-h-11 items-center rounded-xl bg-orange-600 px-5 font-bold text-white hover:bg-orange-500">
            {{ copy.emptyCta }}
          </NuxtLink>
        </div>
        <template v-else>
          <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <li v-for="(build, index) in items" :key="build.id">
              <BuildCard :build="build" heading-level="h2" :eager="index < 4" />
            </li>
          </ul>
          <div v-if="nextCursor" class="mt-8 flex justify-center">
            <button
              type="button"
              class="inline-flex min-h-12 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-6 font-bold text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:opacity-60"
              :disabled="loadingMore"
              @click="loadMore"
            >
              <LoaderCircle v-if="loadingMore" class="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              {{ loadingMore ? copy.loading : copy.loadMore }}
            </button>
          </div>
          <p v-if="loadMoreFailed" role="alert" class="mt-4 text-center text-sm text-red-300">{{ copy.error }}</p>
        </template>
      </div>
    </div>

    <section class="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 md:p-12" aria-labelledby="builds-cta-title">
      <h2 id="builds-cta-title" class="text-2xl font-black tracking-tight text-white md:text-3xl">{{ copy.detail.ctaTitle }}</h2>
      <p class="mt-3 max-w-3xl text-zinc-400">{{ copy.detail.ctaBody }}</p>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row">
        <NuxtLink :to="localizePath('/build-battle')" class="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-5 font-bold text-white hover:bg-orange-500">{{ copy.detail.ctaButton }}</NuxtLink>
        <NuxtLink :to="localizePath('/join')" class="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 px-5 font-bold text-white hover:bg-zinc-800">{{ copy.detail.ctaJoin }}</NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { LoaderCircle } from "@lucide/vue";
import BuildCard from "@/components/BuildCard.vue";
import {
  BUILD_GALLERY_TABS,
  buildListQuery,
  isBuildGalleryTab,
  type BuildGalleryTab,
  type BuildSummary,
} from "@/utils/build-gallery";

definePageMeta({ alias: ["/fr/galerie", "/de/builds", "/it/builds", "/bg/builds", "/es/builds", "/hi/builds", "/pt-br/builds"] });

const PAGE_SIZE = 24;
const route = useRoute();
const router = useRouter();
const { locale, localizePath } = useSiteLocale();
const { copy } = useBuildGalleryCopy();
const api = useBuildApi();

const player = computed(() => {
  const value = route.query.player;
  const trimmed = typeof value === "string" ? value.trim() : "";
  // Java and Bedrock (Floodgate) names: keep it permissive, the API validates.
  return trimmed.length > 0 && trimmed.length <= 32 && !/[<>"\\]/.test(trimmed) ? trimmed : "";
});
const tab = computed<BuildGalleryTab>(() => {
  const value = route.query.tab;
  if (isBuildGalleryTab(value)) return value;
  return player.value ? "recent" : "week";
});

const { data, pending, error, refresh } = await useAsyncData(
  () => `builds:${tab.value}:${player.value}:${locale.value.code}`,
  () => api.list({ ...buildListQuery(tab.value), limit: PAGE_SIZE, player: player.value || undefined, locale: locale.value.code }),
);

const extra = ref<BuildSummary[]>([]);
const extraCursor = ref<string | null | undefined>(undefined);
const loadingMore = ref(false);
const loadMoreFailed = ref(false);
watch(data, () => {
  extra.value = [];
  extraCursor.value = undefined;
  loadMoreFailed.value = false;
});

const items = computed(() => {
  const seen = new Set<string>();
  return [...(data.value?.items ?? []), ...extra.value].filter((build) => !seen.has(build.id) && seen.add(build.id));
});
const nextCursor = computed(() => (extraCursor.value === undefined ? data.value?.nextCursor ?? null : extraCursor.value));

async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return;
  loadingMore.value = true;
  loadMoreFailed.value = false;
  try {
    const page = await api.list({ ...buildListQuery(tab.value), limit: PAGE_SIZE, cursor: nextCursor.value, player: player.value || undefined, locale: locale.value.code });
    extra.value = [...extra.value, ...page.items];
    extraCursor.value = page.nextCursor;
  } catch {
    loadMoreFailed.value = true;
  } finally {
    loadingMore.value = false;
  }
}

const tabRefs = new Map<BuildGalleryTab, HTMLElement>();
function setTabRef(item: BuildGalleryTab, element: unknown) {
  if (element instanceof HTMLElement) tabRefs.set(item, element);
}

function selectTab(item: BuildGalleryTab) {
  const defaultTab = player.value ? "recent" : "week";
  const query = { ...route.query, tab: item === defaultTab ? undefined : item };
  router.replace({ query });
}

function onTabKeydown(event: KeyboardEvent) {
  const index = BUILD_GALLERY_TABS.indexOf(tab.value);
  const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: BUILD_GALLERY_TABS.length - 1 - index };
  const move = moves[event.key];
  if (move === undefined) return;
  event.preventDefault();
  const next = BUILD_GALLERY_TABS[(index + move + BUILD_GALLERY_TABS.length) % BUILD_GALLERY_TABS.length]!;
  selectTab(next);
  nextTick(() => tabRefs.get(next)?.focus());
}

useLocalizedSeo(
  "/builds",
  computed(() => copy.value.seoTitle),
  computed(() => copy.value.seoDescription),
  { robots: computed(() => (player.value ? "noindex, follow" : undefined)) },
);
</script>
