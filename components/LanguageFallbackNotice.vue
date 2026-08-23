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
const messages: Record<SiteLocaleCode, string> = {
  en: "This page is currently available in English.",
  fr: "Cette page est actuellement affichée en anglais.",
  de: "Diese Seite ist derzeit auf Englisch verfügbar.",
  it: "Questa pagina è attualmente disponibile in inglese.",
  bg: "Тази страница в момента е достъпна на английски.",
  es: "Esta página está disponible actualmente en inglés.",
  hi: "यह पेज फिलहाल अंग्रेज़ी में उपलब्ध है।",
  "pt-BR": "Esta página está disponível em inglês no momento.",
};
const message = computed(() => messages[locale.value.code]);
</script>
