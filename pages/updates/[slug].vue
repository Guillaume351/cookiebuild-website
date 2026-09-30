<template>
  <div class="mx-auto max-w-4xl space-y-8">
    <nav :aria-label="copy.breadcrumb" class="text-sm text-zinc-400">
      <ol class="flex flex-wrap items-center gap-2">
        <li><NuxtLink :to="localizePath('/')" class="hover:text-white">Cookie Build</NuxtLink></li>
        <li aria-hidden="true">/</li>
        <li><NuxtLink :to="localizePath('/updates')" class="font-bold text-orange-300 hover:text-orange-200">{{ copy.back }}</NuxtLink></li>
        <li aria-hidden="true">/</li>
        <li class="max-w-[16rem] truncate text-zinc-500" aria-current="page">{{ post.title }}</li>
      </ol>
    </nav>
    <UpdatePostCard :post="post" heading-level="h1" />
    <NuxtLink :to="localizePath('/updates')" class="inline-flex min-h-11 items-center text-sm font-bold text-orange-300 hover:text-orange-200">
      ← {{ copy.back }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ alias: ["/fr/updates/:slug", "/de/updates/:slug", "/it/updates/:slug", "/bg/updates/:slug", "/es/updates/:slug", "/hi/updates/:slug", "/pt-br/updates/:slug"] });

import UpdatePostCard from "@/components/UpdatePostCard.vue";
import { updatesCopy } from "@/utils/updates-copy";
import { updateArticleJsonLd, updateLanguage, type UpdatePost } from "@/utils/updates";
import { localizedAbsoluteUrl, localizedSitePath } from "@/utils/site-locales";

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

// Article bodies are published once, in one language (not translated), so every
// language variant of this URL points search engines to the permalink in the
// article's own language.
const articlePath = `/updates/${slug}`;
const articleUrl = localizedAbsoluteUrl(articlePath, updateLanguage(post));
useLocalizedSeo(articlePath, `${post.title} | Cookie Build`, post.summary, {
  canonicalUrl: articleUrl,
  alternates: false,
  ogType: "article",
  ogImage: post.coverImageUrl || undefined,
});
const publishedIso = post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined;
useSeoMeta({
  articlePublishedTime: publishedIso,
  articleSection: post.contentType === "news" ? "News" : "Release notes",
});
useHead(() => ({
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          updateArticleJsonLd(post, articleUrl),
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Cookie Build", item: localizedAbsoluteUrl("/", locale.value) },
              { "@type": "ListItem", position: 2, name: copy.value.back, item: localizedAbsoluteUrl("/updates", locale.value) },
              { "@type": "ListItem", position: 3, name: post.title, item: `https://www.cookie-build.com${localizedSitePath(articlePath, locale.value)}` },
            ],
          },
        ],
      }),
    },
  ],
}));
</script>
