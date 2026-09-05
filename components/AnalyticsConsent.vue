<template>
  <ClientOnly>
    <div v-if="analytics.enabled" class="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl">
      <section v-if="analytics.consent.value === null || analytics.preferencesOpen.value" aria-labelledby="analytics-consent-title" class="rounded-2xl border border-zinc-600 bg-zinc-950 p-5 text-white shadow-2xl">
        <h2 id="analytics-consent-title" class="text-lg font-bold">{{ french ? "Mesure d’audience facultative" : "Optional audience measurement" }}</h2>
        <p class="mt-2 text-sm leading-relaxed text-zinc-300">{{ french ? "Autoriser Google Analytics à utiliser des cookies pour mesurer les visites et les étapes de la boutique ? Ton pseudo, tes codes de connexion et tes informations de paiement ne sont pas envoyés dans nos événements. Refuser ne change pas l’accès au site." : "Allow Google Analytics cookies to measure visits and shop steps? Our events do not include your player name, login codes or payment details. Refusing does not change your access to the site." }}</p>
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
