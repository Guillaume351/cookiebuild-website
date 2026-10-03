<template>
  <article class="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition-colors hover:border-orange-500/60 focus-within:border-orange-400 motion-reduce:transition-none">
    <div class="relative aspect-[1200/630] overflow-hidden bg-zinc-950">
      <img
        :src="build.ogImageUrl"
        :alt="copy.cardAlt(build.theme, build.playerName)"
        width="1200"
        height="630"
        :loading="eager ? 'eager' : 'lazy'"
        decoding="async"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <span v-if="badge" class="absolute left-3 top-3 rounded-lg bg-black/70 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-amber-300 backdrop-blur">
        {{ badge }}
      </span>
    </div>
    <div class="flex items-start justify-between gap-3 p-4">
      <div class="min-w-0">
        <component :is="headingLevel" class="truncate text-lg font-black text-white">
          <NuxtLink :to="detailPath" class="after:absolute after:inset-0 focus-visible:outline-none">
            {{ build.theme }}
          </NuxtLink>
        </component>
        <p class="mt-1 truncate text-sm text-zinc-400">{{ copy.by(build.playerName) }}</p>
      </div>
      <p class="flex shrink-0 items-center gap-1.5 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-sm font-bold text-rose-200">
        <Heart class="h-4 w-4 fill-rose-500 text-rose-500" aria-hidden="true" />
        <span class="sr-only">{{ formatLikes(build.likeCount) }}</span>
        <span aria-hidden="true">{{ formatNumber(build.likeCount) }}</span>
      </p>
    </div>
    <span class="pointer-events-none absolute inset-0 rounded-2xl ring-orange-400 group-focus-within:ring-2" aria-hidden="true" />
  </article>
</template>

<script setup lang="ts">
import { Heart } from "@lucide/vue";
import { buildDetailPath, type BuildSummary } from "@/utils/build-gallery";

const props = withDefaults(defineProps<{
  build: BuildSummary;
  headingLevel?: "h2" | "h3" | "h4";
  eager?: boolean;
}>(), { headingLevel: "h3", eager: false });

const { locale } = useSiteLocale();
const { copy, formatLikes, formatNumber } = useBuildGalleryCopy();
const detailPath = computed(() => buildDetailPath(props.build.shortCode, locale.value.code));
const badge = computed(() => {
  if (props.build.outcome === "solo") return null;
  return props.build.placement && props.build.placement <= 3 && props.build.builders > 1 ? copy.value.placement(props.build.placement) : null;
});
</script>
