<template>
  <div class="space-y-12">
    <NuxtLink :to="localizePath('/builds')" class="inline-flex min-h-11 items-center text-sm font-bold text-orange-300 hover:text-orange-200">
      ← {{ copy.detail.back }}
    </NuxtLink>

    <div v-if="!build" role="alert" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
      <p class="text-zinc-300">{{ copy.detail.unavailable }}</p>
      <button type="button" class="mt-4 min-h-11 rounded-xl bg-orange-600 px-5 font-bold text-white hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400" @click="refresh()">
        {{ copy.retry }}
      </button>
    </div>

    <template v-else>
      <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="relative aspect-square max-h-[75vh] w-full overflow-hidden rounded-3xl border border-zinc-800 bg-stone-900 shadow-2xl sm:aspect-[4/3]">
          <ClientOnly>
            <LazyBuildViewer :short-code="build.shortCode" :theme="build.theme" :player-name="build.playerName" :og-image-url="build.ogImageUrl" />
            <template #fallback>
              <img :src="build.ogImageUrl" :alt="copy.cardAlt(build.theme, build.playerName)" width="1200" height="630" class="h-full w-full object-cover" />
            </template>
          </ClientOnly>
        </div>

        <aside class="space-y-6">
          <div>
            <p class="text-sm font-black uppercase tracking-widest text-orange-400">{{ copy.eyebrow }} · {{ copy.detail.theme }}</p>
            <h1 class="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">{{ build.theme }}</h1>
            <p class="mt-2 text-lg text-zinc-300">{{ copy.by(build.playerName) }}</p>
            <ul class="mt-4 flex flex-wrap gap-2 text-sm">
              <li v-if="badge" class="rounded-lg bg-amber-500/15 px-3 py-1.5 font-bold text-amber-200">{{ badge }}</li>
              <li class="rounded-lg bg-zinc-800 px-3 py-1.5 text-zinc-300">{{ copy.detail.blocks(formatNumber(build.blockCount)) }}</li>
              <li v-if="builtOn" class="rounded-lg bg-zinc-800 px-3 py-1.5 text-zinc-300">{{ copy.detail.builtOn(builtOn) }}</li>
            </ul>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="inline-flex min-h-12 items-center gap-2 rounded-xl px-5 font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 motion-reduce:transition-none"
              :class="liked ? 'bg-rose-600 text-white hover:bg-rose-500' : 'border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800'"
              :aria-pressed="liked"
              :aria-label="`${liked ? copy.detail.unlike : copy.detail.like} (${formatLikes(likeCount)})`"
              :disabled="likePending"
              @click="toggleLike"
            >
              <Heart class="h-5 w-5" :class="liked ? 'fill-white' : 'text-rose-400'" aria-hidden="true" />
              <span aria-hidden="true">{{ formatNumber(likeCount) }}</span>
            </button>
            <button
              v-if="canNativeShare"
              type="button"
              class="inline-flex min-h-12 items-center gap-2 rounded-xl bg-orange-600 px-5 font-bold text-white hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
              @click="nativeShare"
            >
              <Share2 class="h-5 w-5" aria-hidden="true" />
              {{ copy.detail.share }}
            </button>
          </div>
          <p v-if="likeFailed" role="alert" class="text-sm text-red-300">{{ copy.detail.likeError }}</p>

          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 class="text-sm font-black uppercase tracking-widest text-zinc-400">{{ copy.detail.share }}</h2>
            <div class="mt-3 grid gap-2">
              <button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 px-4 text-left font-bold text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400" @click="copyToClipboard(shareUrl, copy.detail.link)">
                <Link2 class="h-4 w-4" aria-hidden="true" />
                {{ copy.detail.copyLink }}
              </button>
              <a :href="xShareUrl" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 px-4 font-bold text-white hover:bg-zinc-800">
                <span aria-hidden="true" class="w-4 text-center font-black">𝕏</span>
                {{ copy.detail.shareOnX }}
              </a>
              <a :href="whatsAppShareUrl" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 px-4 font-bold text-white hover:bg-zinc-800">
                <MessageCircle class="h-4 w-4" aria-hidden="true" />
                {{ copy.detail.shareOnWhatsApp }}
              </a>
              <a :href="build.ogImageUrl" target="_blank" rel="noopener" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 px-4 font-bold text-white hover:bg-zinc-800">
                <ImageIcon class="h-4 w-4" aria-hidden="true" />
                {{ copy.detail.openImage }}
              </a>
            </div>
          </div>

          <button type="button" class="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-zinc-400 underline-offset-4 hover:text-red-300 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400" @click="reportDialog?.open()">
            <Flag class="h-4 w-4" aria-hidden="true" />
            {{ copy.detail.report }}
          </button>
          <BuildReportDialog ref="reportDialog" :short-code="build.shortCode" />
        </aside>
      </div>

      <section v-if="otherBuilds.length" aria-labelledby="other-builds-title">
        <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="other-builds-title" class="text-2xl font-black tracking-tight text-white md:text-3xl">{{ copy.detail.moreFrom(build.playerName) }}</h2>
          <NuxtLink :to="playerGalleryPath" class="inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">{{ copy.detail.seeAllFrom(build.playerName) }} →</NuxtLink>
        </div>
        <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <li v-for="other in otherBuilds" :key="other.id"><BuildCard :build="other" heading-level="h3" /></li>
        </ul>
      </section>

      <section class="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-950/40 via-zinc-950 to-zinc-950 p-8 md:p-12" aria-labelledby="build-cta-title">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-start gap-4">
            <img src="/buildbattle-icon.svg" alt="" width="48" height="48" class="h-12 w-12 shrink-0" />
            <div>
              <h2 id="build-cta-title" class="text-2xl font-black tracking-tight text-white md:text-3xl">{{ copy.detail.ctaTitle }}</h2>
              <p class="mt-3 max-w-2xl text-zinc-300">{{ copy.detail.ctaBody }}</p>
            </div>
          </div>
          <div class="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
            <NuxtLink :to="localizePath('/build-battle')" class="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-5 font-bold text-white hover:bg-orange-500">{{ copy.detail.ctaButton }}</NuxtLink>
            <NuxtLink :to="localizePath('/join')" class="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 px-5 font-bold text-white hover:bg-zinc-800">{{ copy.detail.ctaJoin }}</NuxtLink>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Flag, Heart, Image as ImageIcon, Link2, MessageCircle, Share2 } from "@lucide/vue";
import BuildCard from "@/components/BuildCard.vue";
import BuildReportDialog from "@/components/BuildReportDialog.vue";
import { isBuildShortCode, type BuildSummary } from "@/utils/build-gallery";
import { COOKIE_BUILD_SITE_URL } from "@/utils/game-landings";
import { localizedAbsoluteUrl } from "@/utils/site-locales";

definePageMeta({ alias: ["/fr/galerie/:code", "/de/builds/:code", "/it/builds/:code", "/bg/builds/:code", "/es/builds/:code", "/hi/builds/:code", "/pt-br/builds/:code"] });

const route = useRoute();
const code = String(route.params.code ?? "");
if (!isBuildShortCode(code)) throw createError({ statusCode: 404, statusMessage: "Build not found" });

const { locale, localizePath } = useSiteLocale();
const { copy, formatLikes, formatNumber, formatDate } = useBuildGalleryCopy();
const api = useBuildApi();
const { copyToClipboard } = useCopyToast();

const { data: build, error: loadError, refresh } = await useAsyncData(
  () => `build:${code}:${locale.value.code}`,
  () => api.get(code, locale.value.code),
);
// api.get resolves null for unknown, hidden or private builds: render a real 404.
if (build.value === null && !loadError.value) throw createError({ statusCode: 404, statusMessage: "Build not found", fatal: true });
if (loadError.value && import.meta.server) {
  const event = useRequestEvent();
  if (event) setResponseStatus(event, 503);
}

const liked = ref(build.value?.liked ?? false);
const likeCount = ref(build.value?.likeCount ?? 0);
const likePending = ref(false);
const likeFailed = ref(false);
watch(build, (value) => {
  liked.value = value?.liked ?? false;
  likeCount.value = value?.likeCount ?? 0;
});

async function toggleLike() {
  if (!build.value || likePending.value) return;
  const previous = { liked: liked.value, likeCount: likeCount.value };
  const next = !liked.value;
  // Optimistic update, reconciled with the server's answer.
  liked.value = next;
  likeCount.value = Math.max(0, likeCount.value + (next ? 1 : -1));
  likePending.value = true;
  likeFailed.value = false;
  try {
    const result = await api.setLiked(build.value.shortCode, next, previous.likeCount);
    liked.value = result.liked;
    likeCount.value = result.likeCount;
  } catch {
    liked.value = previous.liked;
    likeCount.value = previous.likeCount;
    likeFailed.value = true;
  } finally {
    likePending.value = false;
  }
}

const badge = computed(() => {
  const value = build.value;
  if (!value) return null;
  if (value.outcome === "solo") return copy.value.solo;
  return value.placement && value.builders > 1 ? copy.value.placement(value.placement) : null;
});
const builtOn = computed(() => (build.value ? formatDate(build.value.createdAt) : ""));
const shareUrl = computed(() => localizedAbsoluteUrl(`/builds/${code}`, locale.value.code));
const shareText = computed(() => (build.value ? copy.value.detail.shareText(build.value.theme, build.value.playerName) : ""));
const xShareUrl = computed(() => `https://x.com/intent/post?${new URLSearchParams({ text: shareText.value, url: shareUrl.value })}`);
const whatsAppShareUrl = computed(() => `https://wa.me/?${new URLSearchParams({ text: `${shareText.value} ${shareUrl.value}` })}`);
const playerGalleryPath = computed(() => `${localizePath("/builds")}?${new URLSearchParams({ player: build.value?.playerName ?? "" })}`);
const absoluteOgImage = computed(() => {
  const url = build.value?.ogImageUrl;
  if (!url) return undefined;
  return url.startsWith("/") ? `${COOKIE_BUILD_SITE_URL}${url}` : url;
});

const canNativeShare = ref(false);
async function nativeShare() {
  if (!build.value) return;
  try {
    await navigator.share({ title: copy.value.detail.shareTitle(build.value.theme, build.value.playerName), text: shareText.value, url: shareUrl.value });
  } catch {
    // Dismissed by the user or not allowed: nothing to do.
  }
}

const reportDialog = ref<InstanceType<typeof BuildReportDialog> | null>(null);
const otherBuilds = ref<BuildSummary[]>([]);

onMounted(async () => {
  canNativeShare.value = typeof navigator.share === "function";
  if (!build.value) return;
  try {
    const page = await api.list({ sort: "recent", player: build.value.playerName, limit: 9, locale: locale.value.code });
    otherBuilds.value = page.items.filter((item) => item.shortCode !== code).slice(0, 4);
  } catch {
    otherBuilds.value = [];
  }
});

useLocalizedSeo(
  `/builds/${code}`,
  computed(() => (build.value ? copy.value.detail.seoTitle(build.value.theme, build.value.playerName) : copy.value.seoTitle)),
  computed(() => (build.value ? copy.value.detail.seoDescription(build.value.theme, build.value.playerName) : copy.value.seoDescription)),
  {
    // Player-generated content: shareable, but never indexed.
    robots: "noindex, follow",
    ogImage: absoluteOgImage,
    alternates: false,
  },
);
</script>
