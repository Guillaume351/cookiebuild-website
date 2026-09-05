<template>
  <p
    v-if="showFallback"
    class="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100"
    role="status"
  >
    {{ message }}
  </p>
</template>

<script setup lang="ts">
import type { SiteLocaleCode } from "@/utils/site-locales";

const props = defineProps<{ availableLocales: SiteLocaleCode[] }>();
const { locale } = useSiteLocale();
const showFallback = computed(() => !props.availableLocales.includes(locale.value.code));
const labels: Record<SiteLocaleCode, string> = {
  en: "Available page languages:",
  fr: "Langues disponibles pour cette page :",
  de: "Verfügbare Sprachen dieser Seite:",
  it: "Lingue disponibili per questa pagina:",
  bg: "Налични езици за тази страница:",
  es: "Idiomas disponibles para esta página:",
  hi: "इस पेज की उपलब्ध भाषाएँ:",
  "pt-BR": "Idiomas disponíveis para esta página:",
};
const message = computed(() => {
  const names = new Intl.DisplayNames([locale.value.code], { type: "language" });
  return `${labels[locale.value.code]} ${props.availableLocales.map((code) => names.of(code)).join(", ")}.`;
});
</script>
