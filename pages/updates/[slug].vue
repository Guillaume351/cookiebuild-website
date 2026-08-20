<template>
  <div class="mx-auto max-w-4xl space-y-8">
    <NuxtLink to="/updates" class="inline-flex min-h-11 items-center text-sm font-bold text-orange-300 hover:text-orange-200">
      ← All updates
    </NuxtLink>
    <UpdatePostCard :post="post" />
  </div>
</template>

<script setup lang="ts">
import UpdatePostCard from "@/components/UpdatePostCard.vue";
import type { UpdatePost } from "@/utils/updates";

const route = useRoute();
const slug = String(route.params.slug || "");
const { data, error } = await useFetch<{ data: UpdatePost[] }>("/api/mobile/v1/news", {
  query: { slug, includeSuperseded: "true", limit: 1 },
});
const post = data.value?.data[0];

if (error.value || !post) {
  throw createError({ statusCode: 404, statusMessage: "Update not found" });
}

useSeoMeta({
  title: `${post.title} | Cookie Build`,
  description: post.summary,
  ogTitle: post.title,
  ogDescription: post.summary,
  ogImage: post.coverImageUrl ?? "https://www.cookie-build.com/cookie-build-social.webp",
});

useHead({
  link: [{ rel: "canonical", href: `https://www.cookie-build.com/updates/${slug}` }],
});
</script>
