<template>
  <section class="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-7 sm:p-9">
    <h2 class="text-2xl font-black text-white">{{ copy.play }}</h2>
    <p class="mt-4 leading-relaxed text-zinc-300">{{ copy.connect }}</p>
    <dl class="mt-5 flex flex-wrap gap-x-10 gap-y-5">
      <div><dt class="text-sm text-zinc-400">Java</dt><dd class="mt-1 font-mono font-bold text-white">play.cookie-build.com</dd></div>
      <div><dt class="text-sm text-zinc-400">Bedrock</dt><dd class="mt-1 font-mono font-bold text-white">play.cookie-build.com · 19132</dd></div>
      <div><dt class="text-sm text-zinc-400">{{ copy.join }}</dt><dd class="mt-1 font-mono font-bold text-emerald-300">{{ command }}</dd></div>
    </dl>
    <p class="mt-5 text-sm text-zinc-400">{{ copy.leave }}</p>
  </section>
</template>
<script setup lang="ts">
import { gameUiCopy } from "@/utils/game-ui-copy";
defineProps<{ command: string }>();
const { locale } = useSiteLocale();
const copy = computed(() => gameUiCopy[locale.value.code]);
</script>
