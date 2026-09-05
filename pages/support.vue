<template>
  <main class="mx-auto max-w-3xl space-y-8 py-12 text-gray-300">
    <LanguageFallbackNotice :available-locales="['en', 'fr']" />
    <header>
      <h1 class="mb-3 text-4xl font-bold text-white">Cookie Build Support</h1>
      <p lang="fr">Assistance Cookie Build · English and French support</p>
    </header>

    <section class="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 class="mb-3 text-2xl font-semibold text-white">Contact · Contact</h2>
      <p>
        Email
        <a class="font-semibold text-orange-400" href="mailto:support@cookie-build.com?subject=Cookie%20Build%20support">
          support@cookie-build.com
        </a>.
        Include your Minecraft name, Java or Bedrock edition, and a short description. For a web
        purchase, include the Cookie Build order reference and status shown in history. Do not send
        passwords, one-time link codes, private keys, full card numbers, or card security codes.
      </p>
      <p class="mt-3" lang="fr">
        Indiquez votre pseudo Minecraft, l’édition Java ou Bedrock, la version de l’app, le modèle
        d’appareil et une brève description. Pour un achat web, indiquez la référence de commande et
        son statut dans l’historique. N’envoyez jamais mot de passe, code temporaire, numéro de carte
        complet ou cryptogramme.
      </p>
    </section>

    <section>
      <h2 class="mb-3 text-2xl font-semibold text-white">Quick help · Aide rapide</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <article class="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 class="font-bold text-white">Connect to the server</h3>
          <p class="mt-2">Java: <strong>play.cookie-build.com</strong></p>
          <p>Bedrock: <strong>play.cookie-build.com:19132</strong></p>
        </article>
        <article class="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 class="font-bold text-white">Web purchases · Achats web</h3>
          <p class="mt-2">Run <code>/support link</code>, then use <NuxtLink class="text-orange-400" to="/cosmetics/connect">the secure web linking page</NuxtLink>. Inventory, purchase history, withdrawal and the Stripe portal are available in <NuxtLink class="text-orange-400" to="/cosmetics/history">your web space</NuxtLink>.</p>
        </article>
        <article class="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 class="font-bold text-white">Link the app</h3>
          <p class="mt-2">Join Cookie Build, run <code>/app link</code>, then enter the eight-character code in the app within 10 minutes.</p>
        </article>
        <article class="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 class="font-bold text-white">Notifications</h3>
          <p class="mt-2">They stay off until you enable them in the app. Disable them at any time in Profile.</p>
        </article>
        <article class="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 class="font-bold text-white">Friends and parties</h3>
          <p class="mt-2">Link a player, use an exact Minecraft name, and pull to refresh. Parties support up to four players.</p>
        </article>
      </div>
    </section>

    <section class="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 class="mb-3 text-2xl font-semibold text-white">Seller information · Informations vendeur</h2>
      <p v-if="seller?.legalName"><strong>{{ seller?.legalName }}</strong><br />{{ seller?.legalAddress }}<template v-if="seller?.businessId"><br />ID: {{ seller?.businessId }}</template><template v-if="seller?.vatId"><br />VAT/TVA: {{ seller?.vatId }}</template></p>
      <p v-else>Les achats sont actuellement indisponibles. Contacte le support pour toute question. · Purchases are currently unavailable. Contact support with any questions.</p>
      <p v-if="seller?.mediatorName && seller?.mediatorUrl" class="mt-3">Consumer mediator · Médiateur : {{ seller?.mediatorName }}<template v-if="seller?.mediatorUrl"> — <a class="text-orange-400" :href="seller?.mediatorUrl">{{ seller?.mediatorUrl }}</a></template></p>
    </section>

    <section class="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 class="mb-3 text-2xl font-semibold text-white">Privacy and account controls</h2>
      <div class="flex flex-wrap gap-3">
        <NuxtLink class="rounded-md bg-orange-600 px-4 py-2 font-semibold text-white" to="/privacy">Privacy policy</NuxtLink>
        <NuxtLink class="rounded-md border border-gray-700 px-4 py-2 font-semibold text-white" to="/account/delete">Delete account</NuxtLink>
        <NuxtLink class="rounded-md border border-gray-700 px-4 py-2 font-semibold text-white" to="/terms">Terms</NuxtLink>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
const { data: commerceCatalog } = await useFetch("/api/cosmetics/catalog");
const seller = computed(() => commerceCatalog.value?.data.commerce.seller);

import { publicPageSeo } from "@/utils/public-page-seo";

definePageMeta({ alias: ["/fr/support", "/de/support", "/it/support", "/bg/support", "/es/support", "/hi/support", "/pt-br/support"] });

const { locale } = useSiteLocale();
const seo = computed(() => publicPageSeo(locale.value.code, "support"));
useLocalizedSeo("/support", () => seo.value.title, () => seo.value.description);
</script>
