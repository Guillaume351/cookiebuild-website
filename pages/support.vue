<template>
  <main class="mx-auto max-w-3xl space-y-8 py-12 text-gray-300">
    <header>
      <h1 class="mb-3 text-4xl font-bold text-white">{{ support.title }}</h1>
      <p>{{ support.languages }}</p>
    </header>

    <section class="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 class="mb-3 text-2xl font-semibold text-white">{{ support.contact }}</h2>
      <a class="font-semibold text-orange-400" href="mailto:support@cookie-build.com?subject=Cookie%20Build%20support">support@cookie-build.com</a>
      <p class="mt-3">{{ support.contactAdvice }}</p>
    </section>

    <section>
      <h2 class="mb-3 text-2xl font-semibold text-white">{{ support.quickHelp }}</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <article class="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 class="font-bold text-white">{{ support.connect }}</h3>
          <p class="mt-2">Java: <strong>play.cookie-build.com</strong></p>
          <p>Bedrock: <strong>play.cookie-build.com:19132</strong></p>
        </article>
        <article class="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 class="font-bold text-white">{{ support.webPurchases }}</h3>
          <p class="mt-2">{{ support.webInstructions }}</p>
          <div class="mt-3 flex flex-col gap-2">
            <NuxtLink class="text-orange-400" :to="localizePath('/cosmetics/connect')">{{ support.secureLink }}</NuxtLink>
            <NuxtLink class="text-orange-400" :to="localizePath('/cosmetics/history')">{{ support.webSpace }}</NuxtLink>
          </div>
        </article>
        <article class="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 class="font-bold text-white">{{ support.appLink }}</h3>
          <p class="mt-2">{{ support.appInstructions }}</p>
        </article>
        <article class="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 class="font-bold text-white">{{ support.notifications }}</h3>
          <p class="mt-2">{{ support.notificationInstructions }}</p>
        </article>
        <article class="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 class="font-bold text-white">{{ support.friends }}</h3>
          <p class="mt-2">{{ support.friendInstructions }}</p>
        </article>
      </div>
    </section>

    <section class="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 class="mb-3 text-2xl font-semibold text-white">{{ support.seller }}</h2>
      <p v-if="seller?.legalName"><strong>{{ seller?.legalName }}</strong><br />{{ seller?.legalAddress }}<template v-if="seller?.businessId"><br />ID: {{ seller?.businessId }}</template><template v-if="seller?.vatId"><br />VAT/TVA: {{ seller?.vatId }}</template></p>
      <p v-else>{{ support.unavailable }}</p>
      <p v-if="seller?.mediatorName && seller?.mediatorUrl" class="mt-3">{{ support.mediator }} : {{ seller?.mediatorName }} — <a class="text-orange-400" :href="seller?.mediatorUrl">{{ seller?.mediatorUrl }}</a></p>
    </section>

    <section class="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 class="mb-3 text-2xl font-semibold text-white">{{ support.controls }}</h2>
      <div class="flex flex-wrap gap-3">
        <NuxtLink class="rounded-md bg-orange-600 px-4 py-2 font-semibold text-white" :to="localizePath('/privacy')">{{ copy.footer.privacy }}</NuxtLink>
        <NuxtLink class="rounded-md border border-gray-700 px-4 py-2 font-semibold text-white" :to="localizePath('/account/delete')">{{ copy.footer.deleteAccount }}</NuxtLink>
        <NuxtLink class="rounded-md border border-gray-700 px-4 py-2 font-semibold text-white" :to="localizePath('/terms')">{{ copy.footer.terms }}</NuxtLink>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { publicPageSeo } from "@/utils/public-page-seo";
import { SUPPORT_COPY } from "@/utils/support-copy";

definePageMeta({ alias: ["/fr/support", "/de/support", "/it/support", "/bg/support", "/es/support", "/hi/support", "/pt-br/support"] });
const { data: commerceCatalog } = await useFetch("/api/cosmetics/catalog");
const seller = computed(() => commerceCatalog.value?.data.commerce.seller);
const { locale, copy, localizePath } = useSiteLocale();
const support = computed(() => SUPPORT_COPY[locale.value.code]);
const seo = computed(() => publicPageSeo(locale.value.code, "support"));
useLocalizedSeo("/support", () => seo.value.title, () => seo.value.description);
</script>
