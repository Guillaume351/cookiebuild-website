<template>
  <main class="mx-auto max-w-4xl space-y-10 py-12 text-zinc-300">
    <header class="space-y-4">
      <Badge class="bg-orange-600 hover:bg-orange-600">{{ selectedCopy.badge }}</Badge>
      <h1 class="text-4xl font-black tracking-tight text-white md:text-5xl">{{ selectedCopy.title }}</h1>
      <p class="max-w-3xl text-lg text-zinc-400">
        {{ selectedCopy.intro }}
      </p>
    </header>


    <article :lang="selectedCopy.lang" class="space-y-8">
      <div class="rounded-2xl border border-orange-500/25 bg-orange-500/10 p-6">
        <p class="text-lg font-bold text-orange-100">{{ selectedCopy.summary }}</p>
      </div>

      <section v-for="(rule, index) in selectedCopy.rules" :key="rule.title" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div class="flex gap-4">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-600 font-black text-white">{{ index + 1 }}</span>
          <div>
            <h2 class="text-xl font-bold text-white">{{ rule.title }}</h2>
            <p class="mt-2 leading-relaxed text-zinc-400">{{ rule.description }}</p>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 class="text-2xl font-black text-white">{{ selectedCopy.safetyTitle }}</h2>
        <p class="mt-3 text-zinc-400">{{ selectedCopy.safetyIntro }}</p>
        <dl class="mt-6 grid gap-4 md:grid-cols-3">
          <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <dt><code class="text-orange-300">/mute &lt;player&gt;</code></dt>
            <dd class="mt-2 text-sm text-zinc-400">{{ selectedCopy.mute }}</dd>
          </div>
          <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <dt><code class="text-orange-300">/block &lt;player&gt;</code></dt>
            <dd class="mt-2 text-sm text-zinc-400">{{ selectedCopy.block }}</dd>
          </div>
          <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <dt><code class="text-orange-300">/report &lt;player&gt; &lt;reason&gt;</code></dt>
            <dd class="mt-2 text-sm text-zinc-400">{{ selectedCopy.report }}</dd>
          </div>
        </dl>
        <p class="mt-5 text-sm text-zinc-400">
          {{ selectedCopy.support }}
          <a class="font-bold text-orange-300 hover:text-orange-200" href="mailto:support@cookie-build.com">support@cookie-build.com</a>.
        </p>
      </section>

      <p class="text-sm text-zinc-500">{{ selectedCopy.moderation }}</p>
    </article>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ alias: ["/fr/rules", "/de/rules", "/it/rules", "/bg/rules", "/es/rules", "/hi/rules", "/pt-br/rules"] });

import Badge from "@/components/ui/badge/Badge.vue";
import { publicPageSeo } from "@/utils/public-page-seo";
import { RULES_COPY } from "@/utils/rules-copy";



const { locale } = useSiteLocale();
const selectedCopy = computed(() => RULES_COPY[locale.value.code]);

const seo = computed(() => publicPageSeo(locale.value.code, "rules"));
useLocalizedSeo("/rules", () => seo.value.title, () => seo.value.description);
</script>
