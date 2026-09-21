<template>
  <div class="mx-auto max-w-4xl space-y-8">
    <NuxtLink :to="localizePath('/updates')" class="inline-flex min-h-11 items-center text-sm font-bold text-orange-300 hover:text-orange-200">
      ← {{ copy.back }}
    </NuxtLink>
    <UpdatePostCard :post="post" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ alias: ["/fr/updates/:slug", "/de/updates/:slug", "/it/updates/:slug", "/bg/updates/:slug", "/es/updates/:slug", "/hi/updates/:slug", "/pt-br/updates/:slug"] });

import UpdatePostCard from "@/components/UpdatePostCard.vue";
import { updatesCopy } from "@/utils/updates-copy";
import type { UpdatePost } from "@/utils/updates";

const route = useRoute();
const { locale, localizePath } = useSiteLocale();
const copy = computed(() => updatesCopy[locale.value.code]);
const slug = String(route.params.slug || "");
const { data, error } = await useFetch<{ data: UpdatePost[] }>("/api/mobile/v1/news", {
  query: { slug, includeSuperseded: "true", limit: 1 },
});
const post = data.value?.data[0];

if (error.value || !post) {
  throw createError({ statusCode: 404, statusMessage: "Update not found" });
}

useLocalizedSeo(`/updates/${slug}`, `${post.title} | Cookie Build`, post.summary);
</script>
