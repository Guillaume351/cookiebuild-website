<template>
  <NuxtLayout>
    <section class="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center py-16 text-center">
      <p class="text-sm font-black uppercase tracking-[0.3em] text-orange-400">{{ statusCode }}</p>
      <h1 class="mt-4 text-4xl font-black text-white md:text-5xl">{{ heading }}</h1>
      <p class="mt-5 max-w-xl text-lg text-zinc-400">{{ body }}</p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <NuxtLink class="rounded-lg bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700" :to="localizePath('/')" @click="clearError()">{{ copy.navigation.home }}</NuxtLink>
        <NuxtLink class="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-3 font-bold text-white hover:bg-zinc-800" :to="localizePath('/updates')" @click="clearError()">{{ copy.navigation.updates }}</NuxtLink>
        <NuxtLink class="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-3 font-bold text-white hover:bg-zinc-800" :to="localizePath('/support')" @click="clearError()">{{ copy.footer.support }}</NuxtLink>
      </div>
    </section>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { NuxtError } from "#app";
import { NOT_FOUND_COPY } from "@/utils/error-copy";

const props = defineProps<{ error: NuxtError }>();
const { locale, copy, localizePath } = useSiteLocale();
const statusCode = computed(() => props.error?.statusCode || 500);
const notFound = computed(() => NOT_FOUND_COPY[locale.value.code]);
// Only 404s get page-specific copy; other errors never expose internal messages.
const heading = computed(() => statusCode.value === 404 ? notFound.value.title : "Cookie Build");
const body = computed(() => statusCode.value === 404 ? notFound.value.description : copy.value.status.unavailable);

useSeoMeta({
  title: () => `${heading.value} | Cookie Build`,
  description: () => body.value,
  robots: "noindex, nofollow",
  ogTitle: () => `${heading.value} | Cookie Build`,
  ogDescription: () => body.value,
  ogLocale: () => locale.value.ogLocale,
  ogSiteName: "Cookie Build",
});
useHead(() => ({ htmlAttrs: { lang: locale.value.htmlLang } }));
</script>
