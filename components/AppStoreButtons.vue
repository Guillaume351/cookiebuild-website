<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
    <a
      :href="appStoreUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex min-h-14 items-center gap-3 rounded-xl border border-white/15 bg-black px-5 py-3 text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:border-orange-400/70 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      aria-label="Download Cookie Build Network on the App Store"
    >
      <Apple class="h-7 w-7" aria-hidden="true" />
      <span>
        <span class="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Download on the</span>
        <span class="block text-lg font-bold leading-tight">App Store</span>
      </span>
      <ExternalLink class="ml-auto h-4 w-4 text-zinc-500" aria-hidden="true" />
    </a>

    <a
      v-if="androidAvailable"
      :href="googlePlayUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex min-h-14 items-center gap-3 rounded-xl border border-white/15 bg-black px-5 py-3 text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:border-orange-400/70 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      aria-label="Get Cookie Build Network on Google Play"
    >
      <Smartphone class="h-7 w-7" aria-hidden="true" />
      <span>
        <span class="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Get it on</span>
        <span class="block text-lg font-bold leading-tight">Google Play</span>
      </span>
      <ExternalLink class="ml-auto h-4 w-4 text-zinc-500" aria-hidden="true" />
    </a>

    <div
      v-else
      class="inline-flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/70 px-5 py-3 text-left text-zinc-300"
      aria-label="Cookie Build Network is returning to Google Play soon"
    >
      <Smartphone class="h-7 w-7" aria-hidden="true" />
      <span>
        <span class="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Android</span>
        <span class="block text-lg font-bold leading-tight">Returning soon</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Apple, ExternalLink, Smartphone } from "@lucide/vue";

withDefaults(defineProps<{ androidAvailable?: boolean }>(), {
  androidAvailable: true,
});

const appStoreUrl = "https://apps.apple.com/fr/app/cookie-build-network/id1223020091";
const googlePlayUrl = "https://play.google.com/store/apps/details?id=cookiebuild.com.cookiebuildstatus";
</script>
