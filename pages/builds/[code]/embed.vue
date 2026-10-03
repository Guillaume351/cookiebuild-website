<template>
  <main class="fixed inset-0 bg-stone-900">
    <h1 class="sr-only">{{ title }}</h1>
    <ClientOnly>
      <LazyBuildViewer :short-code="code" :theme="theme" :player-name="playerName" :og-image-url="ogImageUrl" embed />
      <template #fallback>
        <img v-if="ogImageUrl" :src="ogImageUrl" :alt="title" class="h-full w-full object-cover" />
      </template>
    </ClientOnly>
  </main>
</template>

<script setup lang="ts">
import { buildApiPath, isBuildShortCode } from "@/utils/build-gallery";

// Viewer only, no site chrome: used by the mobile app WebView and external browsers.
definePageMeta({
  layout: false,
  alias: ["/fr/galerie/:code/embed", "/de/builds/:code/embed", "/it/builds/:code/embed", "/bg/builds/:code/embed", "/es/builds/:code/embed", "/hi/builds/:code/embed", "/pt-br/builds/:code/embed"],
});

const route = useRoute();
const code = String(route.params.code ?? "");
if (!isBuildShortCode(code)) throw createError({ statusCode: 404, statusMessage: "Build not found" });

const { locale } = useSiteLocale();
const { copy } = useBuildGalleryCopy();
const api = useBuildApi();

const { data: build, error } = await useAsyncData(
  () => `build-embed:${code}:${locale.value.code}`,
  () => api.get(code, locale.value.code),
);
if (build.value === null && !error.value) throw createError({ statusCode: 404, statusMessage: "Build not found", fatal: true });

// The viewer still works when the summary is temporarily unavailable.
const theme = computed(() => build.value?.theme ?? "Build Battle");
const playerName = computed(() => build.value?.playerName ?? "Cookie Build");
const ogImageUrl = computed(() => build.value?.ogImageUrl ?? buildApiPath(code, "/og.png"));
const title = computed(() => copy.value.viewer.label(theme.value, playerName.value));

useSeoMeta({
  title: () => `${title.value} | Cookie Build`,
  robots: "noindex, nofollow",
});
useHead(() => ({
  htmlAttrs: { lang: locale.value.htmlLang },
  bodyAttrs: { class: "bg-stone-900 overflow-hidden" },
}));
</script>
