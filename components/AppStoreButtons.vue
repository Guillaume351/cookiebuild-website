<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
    <a
      :href="appStoreUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex min-h-14 items-center gap-3 rounded-xl border border-white/15 bg-black px-5 py-3 text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:border-orange-400/70 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      :aria-label="labels.appStoreAria"
    >
      <Apple class="h-7 w-7" aria-hidden="true" />
      <span>
        <span class="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{{ labels.appStorePrefix }}</span>
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
      :aria-label="labels.googlePlayAria"
    >
      <Smartphone class="h-7 w-7" aria-hidden="true" />
      <span>
        <span class="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{{ labels.googlePlayPrefix }}</span>
        <span class="block text-lg font-bold leading-tight">Google Play</span>
      </span>
      <ExternalLink class="ml-auto h-4 w-4 text-zinc-500" aria-hidden="true" />
    </a>

    <div
      v-else
      class="inline-flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/70 px-5 py-3 text-left text-zinc-300"
      :aria-label="labels.androidSoonAria"
    >
      <Smartphone class="h-7 w-7" aria-hidden="true" />
      <span>
        <span class="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Android</span>
        <span class="block text-lg font-bold leading-tight">{{ labels.returningSoon }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Apple, ExternalLink, Smartphone } from "@lucide/vue";

withDefaults(defineProps<{ androidAvailable?: boolean }>(), {
  androidAvailable: true,
});

const appStoreUrl = "https://apps.apple.com/app/id1223020091";
const googlePlayUrl = "https://play.google.com/store/apps/details?id=cookiebuild.com.cookiebuildstatus";
const { locale } = useSiteLocale();
const storeLabels = {
  en: { appStorePrefix: "Download on the", googlePlayPrefix: "Get it on", returningSoon: "Returning soon", appStoreAria: "Download Cookie Build Network on the App Store", googlePlayAria: "Get Cookie Build Network on Google Play", androidSoonAria: "Cookie Build Network is returning to Google Play soon" },
  fr: { appStorePrefix: "Télécharger dans", googlePlayPrefix: "Disponible sur", returningSoon: "Bientôt de retour", appStoreAria: "Télécharger Cookie Build Network sur l’App Store", googlePlayAria: "Télécharger Cookie Build Network sur Google Play", androidSoonAria: "Cookie Build Network sera bientôt de retour sur Google Play" },
  de: { appStorePrefix: "Laden im", googlePlayPrefix: "Jetzt bei", returningSoon: "Bald wieder verfügbar", appStoreAria: "Cookie Build Network im App Store laden", googlePlayAria: "Cookie Build Network bei Google Play laden", androidSoonAria: "Cookie Build Network ist bald wieder bei Google Play verfügbar" },
  it: { appStorePrefix: "Scarica su", googlePlayPrefix: "Disponibile su", returningSoon: "Torna presto", appStoreAria: "Scarica Cookie Build Network dall’App Store", googlePlayAria: "Scarica Cookie Build Network da Google Play", androidSoonAria: "Cookie Build Network tornerà presto su Google Play" },
  bg: { appStorePrefix: "Изтегли от", googlePlayPrefix: "Изтегли от", returningSoon: "Очаквайте скоро", appStoreAria: "Изтегли Cookie Build Network от App Store", googlePlayAria: "Изтегли Cookie Build Network от Google Play", androidSoonAria: "Cookie Build Network скоро се връща в Google Play" },
  es: { appStorePrefix: "Descárgala en", googlePlayPrefix: "Disponible en", returningSoon: "Volverá pronto", appStoreAria: "Descargar Cookie Build Network en App Store", googlePlayAria: "Descargar Cookie Build Network en Google Play", androidSoonAria: "Cookie Build Network volverá pronto a Google Play" },
  hi: { appStorePrefix: "यहाँ से डाउनलोड करें", googlePlayPrefix: "यहाँ पाएँ", returningSoon: "जल्द वापस आएगा", appStoreAria: "App Store से Cookie Build Network डाउनलोड करें", googlePlayAria: "Google Play से Cookie Build Network डाउनलोड करें", androidSoonAria: "Cookie Build Network जल्द Google Play पर वापस आएगा" },
  "pt-BR": { appStorePrefix: "Baixe na", googlePlayPrefix: "Disponível no", returningSoon: "Voltará em breve", appStoreAria: "Baixar Cookie Build Network na App Store", googlePlayAria: "Baixar Cookie Build Network no Google Play", androidSoonAria: "Cookie Build Network voltará em breve ao Google Play" },
} as const;
const labels = computed(() => storeLabels[locale.value.code]);
</script>
