<template>
  <article
    :id="`news-${post.slug}`"
    class="scroll-mt-24 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-xl"
  >
    <img
      v-if="post.coverImageUrl"
      :src="post.coverImageUrl"
      :alt="`${post.title} cover`"
      class="aspect-[16/9] w-full bg-zinc-950 object-cover"
      loading="lazy"
      decoding="async"
    >
    <div :class="compact ? 'p-5 sm:p-6' : 'p-6 sm:p-8'">
      <time
        class="text-xs font-bold uppercase tracking-[0.18em] text-orange-400"
        :datetime="publishedDateTime"
      >
        {{ newsDate(post.publishedAt) }}
      </time>
      <h2 :class="compact ? 'mt-2 text-xl' : 'mt-3 text-2xl sm:text-3xl'" class="break-words font-black text-white">
        {{ post.title }}
      </h2>
      <p class="mt-3 break-words leading-relaxed text-zinc-300">
        {{ post.summary }}
      </p>
      <p
        v-if="!compact"
        class="mt-6 whitespace-pre-line break-words border-t border-zinc-800 pt-6 leading-7 text-zinc-400"
      >{{ newsBodyText(post.body) }}</p>
      <NuxtLink
        v-else
        :to="`/news#news-${post.slug}`"
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
import { newsBodyText, newsDate, type NewsPost } from "@/utils/news";

const props = withDefaults(defineProps<{
  post: NewsPost;
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
