<template>
  <section v-if="items.length || variant === 'landing'" :aria-labelledby="headingId">
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm font-black uppercase tracking-widest text-orange-400">{{ copy.eyebrow }}</p>
        <h2 :id="headingId" class="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">{{ heading }}</h2>
        <p class="mt-3 max-w-2xl text-zinc-400">{{ body }}</p>
      </div>
      <NuxtLink :to="localizePath('/builds')" class="inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400">
        {{ cta }} →
      </NuxtLink>
    </div>
    <ul v-if="items.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <li v-for="build in items" :key="build.id">
        <BuildCard :build="build" heading-level="h3" />
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import BuildCard from "@/components/BuildCard.vue";
import type { BuildSummary } from "@/utils/build-gallery";

const props = withDefaults(defineProps<{ variant?: "home" | "landing" }>(), { variant: "home" });

const { locale, localizePath } = useSiteLocale();
const { copy } = useBuildGalleryCopy();
const api = useBuildApi();
const headingId = `build-best-of-${props.variant}`;
const heading = computed(() => (props.variant === "home" ? copy.value.home.title : copy.value.landing.title));
const body = computed(() => (props.variant === "home" ? copy.value.home.intro : copy.value.landing.body));
const cta = computed(() => (props.variant === "home" ? copy.value.home.all : copy.value.landing.cta));

const items = ref<BuildSummary[]>([]);

// Client-only: the strip is a bonus and must never slow down or break the page SSR.
onMounted(async () => {
  try {
    const week = await api.list({ sort: "top", period: "week", limit: 4, locale: locale.value.code });
    items.value = week.items.slice(0, 4);
  } catch {
    items.value = [];
  }
});
</script>
