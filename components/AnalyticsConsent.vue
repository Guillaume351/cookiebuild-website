<template>
  <ClientOnly>
    <div v-if="analytics.enabled" class="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-lg">
      <section v-if="analytics.consent.value === null || analytics.preferencesOpen.value" aria-labelledby="analytics-consent-title" class="rounded-2xl border border-zinc-600 bg-zinc-950 p-4 text-white shadow-2xl">
        <h2 id="analytics-consent-title" class="text-base font-bold">{{ french ? "Mesure d’audience facultative" : "Optional audience measurement" }}</h2>
        <p class="mt-2 text-sm leading-relaxed text-zinc-300">{{ french ? "Autoriser les cookies Google Analytics pour comprendre les visites et les clics vers le jeu et la boutique ? Sans publicité ni pseudo transmis. Refuser ne change pas l’accès au site." : "Allow Google Analytics cookies to understand visits and clicks towards the game and shop? No advertising or player names in our events. Declining does not change access to the site." }}</p>
        <NuxtLink :to="localizePath('/privacy')" class="mt-2 inline-block text-sm text-orange-300 underline">{{ french ? "Confidentialité" : "Privacy" }}</NuxtLink>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <button class="min-h-11 rounded-lg border border-zinc-500 px-4 py-3 font-bold hover:bg-zinc-800" @click="analytics.setConsent('denied')">{{ french ? "Refuser" : "Decline" }}</button>
          <button class="min-h-11 rounded-lg border border-zinc-500 px-4 py-3 font-bold hover:bg-zinc-800" @click="analytics.setConsent('granted')">{{ french ? "Autoriser" : "Allow" }}</button>
        </div>
      </section>
    </div>
  </ClientOnly>
</template>
<script setup lang="ts">
const analytics = useShopAnalytics();
const { locale, localizePath } = useSiteLocale();
const french = computed(() => locale.value.code === "fr");
</script>
