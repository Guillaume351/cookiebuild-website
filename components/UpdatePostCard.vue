<template>
  <article
    :id="`update-${post.slug}`"
    class="relative scroll-mt-24 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-xl"
  >
    <span
      :id="`news-${post.slug}`"
      class="pointer-events-none absolute inset-x-0 top-0 scroll-mt-24"
      aria-hidden="true"
    ></span>
    <img
      v-if="post.coverImageUrl"
      :src="post.coverImageUrl"
      :alt="`${post.title} illustration`"
      class="aspect-[16/9] w-full bg-zinc-950 object-cover"
      loading="lazy"
      decoding="async"
    >
    <div :class="compact ? 'p-5 sm:p-6' : 'p-6 sm:p-8'">
      <div class="flex flex-wrap items-center gap-3">
        <Badge
          variant="outline"
          :class="post.contentType === 'news' ? 'border-orange-500/40 bg-orange-500/10 text-orange-200' : 'border-sky-500/40 bg-sky-500/10 text-sky-200'"
        >
          {{ updateTypeLabel(post.contentType) }}
        </Badge>
        <time
          class="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500"
          :datetime="publishedDateTime"
        >
          {{ newsDate(post.publishedAt) }}
        </time>
      </div>
      <h2 :class="compact ? 'mt-3 text-xl' : 'mt-4 text-2xl sm:text-3xl'" class="break-words font-black text-white">
        {{ post.title }}
      </h2>
      <p class="mt-3 break-words leading-relaxed text-zinc-300">
        {{ post.summary }}
      </p>

      <template v-if="!compact">
        <ul
          v-if="post.contentType === 'changelog'"
          class="mt-6 space-y-3 border-t border-zinc-800 pt-6 text-zinc-400"
        >
          <li v-for="line in changelogBodyLines(post.body)" :key="line" class="flex gap-3 leading-relaxed">
            <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" aria-hidden="true"></span>
            <span>{{ line }}</span>
          </li>
        </ul>
        <p
          v-else
          class="mt-6 whitespace-pre-line break-words border-t border-zinc-800 pt-6 leading-7 text-zinc-400"
        >{{ newsBodyText(post.body) }}</p>
      </template>

      <NuxtLink
        v-else
        :to="`/updates#update-${post.slug}`"
        class="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-orange-300 outline-none transition hover:text-orange-200 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-900"
      >
        Read the full update
        <ArrowRight class="h-4 w-4" aria-hidden="true" />
      </NuxtLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ArrowRight } from "@lucide/vue";
import Badge from "@/components/ui/badge/Badge.vue";
import { changelogBodyLines } from "@/utils/changelog";
import { newsBodyText, newsDate } from "@/utils/news";
import { updateTypeLabel, type UpdatePost } from "@/utils/updates";

const props = withDefaults(defineProps<{
  post: UpdatePost;
  compact?: boolean;
}>(), {
  compact: false,
});

const publishedDateTime = computed(() => {
  if (!props.post.publishedAt) return undefined;
  const date = props.post.publishedAt instanceof Date
    ? props.post.publishedAt
    : new Date(props.post.publishedAt);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
});
</script>
