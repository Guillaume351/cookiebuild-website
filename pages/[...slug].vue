<template>
  <main class="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center py-16 text-center">
    <p class="text-sm font-black uppercase tracking-[0.3em] text-orange-400">404</p>
    <h1 class="mt-4 text-4xl font-black text-white md:text-5xl">{{ errorCopy.title }}</h1>
    <p class="mt-5 max-w-xl text-lg text-zinc-400">
      {{ errorCopy.description }}
    </p>
    <div class="mt-8 flex flex-wrap justify-center gap-3">
      <NuxtLink class="rounded-lg bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700" :to="localizePath('/')">{{ copy.navigation.home }}</NuxtLink>
      <NuxtLink class="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-3 font-bold text-white hover:bg-zinc-800" :to="localizePath('/status')">{{ copy.footer.serverStatus }}</NuxtLink>
      <NuxtLink class="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-3 font-bold text-white hover:bg-zinc-800" :to="localizePath('/support')">{{ copy.footer.support }}</NuxtLink>
    </div>
  </main>
</template>

<script setup lang="ts">
import { NOT_FOUND_COPY } from "@/utils/error-copy";

const { locale, copy, localizePath } = useSiteLocale();

const errorCopy = computed(() => NOT_FOUND_COPY[locale.value.code]);
const event = useRequestEvent();
if (event) setResponseStatus(event, 404);

useSeoMeta({
  title: () => `${errorCopy.value.title} | Cookie Build`,
  description: () => errorCopy.value.description,
  robots: "noindex, nofollow",
  ogTitle: () => `${errorCopy.value.title} | Cookie Build`,
  ogDescription: () => errorCopy.value.description,
  ogLocale: () => locale.value.ogLocale,
  ogSiteName: "Cookie Build",
  twitterTitle: () => `${errorCopy.value.title} | Cookie Build`,
  twitterDescription: () => errorCopy.value.description,
});
useHead(() => ({ htmlAttrs: { lang: locale.value.htmlLang } }));
</script>
