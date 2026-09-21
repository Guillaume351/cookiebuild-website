<template>
  <div class="space-y-16 pb-12">
    <p v-if="!purchaseEnabled" role="status" class="rounded-xl border border-orange-400/30 bg-orange-950/20 p-4 text-orange-100">{{ shop.unavailable }} <NuxtLink to="/shop/history" class="font-bold underline">{{ shop.inventory }}</NuxtLink></p>
    <p v-if="catalogResponse?.data.commerce?.mode === 'test'" role="status" class="rounded-xl border border-sky-400/40 bg-sky-950/30 p-4 text-sky-100">{{ shop.testMode }}</p>
    <section class="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-950/40 px-6 py-14 md:px-12 md:py-20">
      <div class="relative z-10 max-w-3xl">
        <span class="inline-flex rounded-full border border-orange-400/40 bg-orange-500/10 px-3 py-1 text-sm font-black uppercase tracking-widest text-orange-200">{{ purchaseEnabled ? copy.common.available : shop.freeBadge }}</span>
        <h1 class="mt-6 text-4xl font-black tracking-tight text-white md:text-6xl">{{ shop.title }}</h1>
        <p class="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-300">
          {{ shop.intro }}
        </p>
        <div class="mt-7 flex flex-wrap gap-3 text-sm font-semibold text-zinc-300">
          <span class="rounded-lg border border-white/10 bg-black/30 px-3 py-2">Java &amp; Bedrock</span>
          <span class="rounded-lg border border-white/10 bg-black/30 px-3 py-2">{{ euros(subscriptionProduct.priceTtcCents) }} {{ shop.monthlyTax }}</span>
          <span class="rounded-lg border border-white/10 bg-black/30 px-3 py-2">{{ shop.fairTitle }}</span>
        </div>
        <div class="mt-7 flex flex-wrap gap-3">
          <NuxtLink to="/shop/connect" class="rounded-xl bg-orange-500 px-5 py-3 font-black text-zinc-950 hover:bg-orange-400">{{ shop.linkPlayer }}</NuxtLink>
          <NuxtLink to="/shop/history" class="rounded-xl border border-white/15 px-5 py-3 font-black text-white hover:border-orange-400">{{ shop.inventory }}</NuxtLink>
        </div>
      </div>
      <div class="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" />
    </section>

    <section id="free-cookie-sparkles" aria-labelledby="free-title" class="grid gap-6 rounded-3xl border border-emerald-300/40 bg-emerald-950/20 p-6 md:grid-cols-[1fr_18rem] md:items-center md:p-9">
      <div>
        <p class="text-sm font-black uppercase tracking-widest text-emerald-300">{{ shop.freeBadge }}</p>
        <h2 id="free-title" class="mt-3 text-3xl font-black text-white">{{ freeItem ? itemText(freeItem).name : shop.freeBadge }}</h2>
        <p class="mt-4 max-w-2xl text-zinc-300">{{ shop.freeDescription }}</p>
        <p class="mt-3 text-sm text-zinc-400">{{ shop.freeInstructions }}</p>
        <NuxtLink to="/shop/history" @click="shopAnalytics.track('free_effect_click', { source: 'shop' })" class="mt-6 inline-flex min-h-11 items-center rounded-xl bg-emerald-300 px-5 py-3 font-black text-zinc-950 hover:bg-emerald-200">{{ shop.equipFree }}</NuxtLink>
      </div>
      <CosmeticPreview v-if="freeItem" :item="freeItem" />
    </section>

    <section aria-labelledby="subscription-title" class="overflow-hidden rounded-3xl border-2 border-amber-300/50 bg-gradient-to-br from-amber-500/15 via-zinc-900 to-orange-950/50 p-6 shadow-[0_0_50px_rgba(245,158,11,.12)] md:p-9">
      <div class="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p class="text-sm font-black uppercase tracking-widest text-amber-300">{{ shop.subscriptionLabel }} · {{ purchaseEnabled ? copy.common.available : copy.common.comingSoon }}</p>
          <h2 id="subscription-title" class="mt-2 text-3xl font-black text-white">{{ shop.subscriptionTitle }}</h2>
          <p class="mt-3 max-w-2xl leading-relaxed text-zinc-300">{{ shop.subscriptionDescription }}</p>
          <ul class="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <li v-for="benefit in subscriptionBenefits" :key="benefit.id" class="rounded-xl border border-amber-200/15 bg-black/25 p-4">
              <strong class="block text-amber-200">{{ itemText(benefit).name }}</strong>
              <span class="mt-1 block leading-relaxed text-zinc-400">{{ itemText(benefit).description }}</span>
            </li>
          </ul>
        </div>
        <div class="min-w-56 rounded-2xl border border-white/10 bg-black/30 p-6 text-center">
          <div><span class="text-4xl font-black text-white">{{ euros(subscriptionProduct.priceTtcCents) }}</span><span class="text-sm font-black text-amber-200"> {{ shop.monthlyTax }}</span></div>
          <p class="mt-2 text-xs leading-relaxed text-zinc-400">{{ shop.renewal }}</p>
          <NuxtLink v-if="purchaseEnabled" :to="`/shop/checkout?product=${subscriptionProduct.id}`" class="mt-5 block min-h-11 w-full rounded-xl bg-amber-300 px-4 py-3 font-black text-zinc-950 hover:bg-amber-200">{{ shop.subscribePay }} {{ euros(subscriptionProduct.priceTtcCents) }} {{ shop.monthlyTax }}</NuxtLink>
          <button v-else type="button" disabled aria-disabled="true" class="mt-5 min-h-11 w-full cursor-not-allowed rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 font-black text-amber-100/50">{{ copy.common.comingSoon }}</button>
        </div>
      </div>
    </section>

    <section aria-labelledby="collection-title">
      <div class="max-w-3xl">
        <p class="text-sm font-black uppercase tracking-widest text-orange-300">{{ shop.previews }}</p>
        <h2 id="collection-title" class="mt-2 text-3xl font-black text-white">{{ shop.collection }}</h2>
        <p class="mt-3 text-zinc-400">{{ shop.previewNotice }}</p>
      </div>
      <div class="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <article v-for="item in catalog.items" :key="item.id" class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-xl">
          <CosmeticPreview :item="item" />
          <div class="px-2 pb-2 pt-5">
            <div class="flex items-start justify-between gap-3">
              <h3 class="text-xl font-black text-white">{{ itemText(item).name }}</h3>
            </div>
            <p class="mt-2 text-sm leading-relaxed text-zinc-400">{{ itemText(item).description }}</p>
            <p class="mt-4 rounded-xl border border-white/5 bg-black/20 p-3 text-xs text-zinc-300">{{ item.slot === "PROFILE_FRAME" ? shop.webOnly : shop.crossEdition }}</p>
          </div>
        </article>
      </div>
    </section>

    <section aria-labelledby="offers-title">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-sm font-black uppercase tracking-widest text-orange-300">{{ shop.prices }}</p>
          <h2 id="offers-title" class="mt-2 text-3xl font-black text-white">{{ shop.oneTime }}</h2>
        </div>
        <p class="max-w-xl text-sm text-zinc-400">{{ shop.recipient }}</p>
      </div>

      <div class="mt-8 grid gap-5 lg:grid-cols-3">
        <article v-for="product in oneTimeProducts" :key="product.id" class="flex flex-col rounded-3xl border border-zinc-800 bg-zinc-900 p-6" :class="product.kind === 'collection_pack' ? 'ring-2 ring-orange-500/50' : ''">
          <h3 class="mt-3 text-2xl font-black text-white">{{ productText(product).name }}</h3>
          <p class="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">{{ productText(product).description }}</p>
          <div class="mt-6">
            <span class="text-3xl font-black text-white">{{ euros(product.priceTtcCents) }}</span>
            <span class="ml-1 text-xs font-bold uppercase text-zinc-500">{{ shop.prices }}</span>
          </div>
          <NuxtLink v-if="purchaseEnabled" :to="`/shop/checkout?product=${product.id}`" class="mt-5 min-h-11 rounded-xl bg-orange-500 px-4 py-3 text-center font-black text-zinc-950 hover:bg-orange-400">{{ shop.pay }} {{ euros(product.priceTtcCents) }}</NuxtLink>
          <button v-else type="button" disabled aria-disabled="true" class="mt-5 min-h-11 cursor-not-allowed rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 font-black text-zinc-500">{{ copy.common.comingSoon }}</button>
        </article>
      </div>

      <div class="mt-6 rounded-3xl border border-sky-400/20 bg-sky-950/20 p-6">
        <div class="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h3 class="text-xl font-black text-white">{{ shop.supportTitle }}</h3>
            <p class="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">{{ shop.supportDescription }}</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <template v-for="support in supportProducts" :key="support.id">
              <NuxtLink v-if="purchaseEnabled" :to="`/shop/checkout?product=${support.id}`" class="min-h-11 rounded-xl border border-sky-500/20 bg-sky-950/40 px-5 py-3 font-black text-sky-100 hover:border-sky-300">{{ shop.supportAt }} {{ euros(support.priceTtcCents) }}</NuxtLink>
              <button v-else type="button" disabled class="min-h-11 cursor-not-allowed rounded-xl border border-sky-500/20 px-5 py-3 font-black text-sky-200/60">{{ shop.supportAt }} {{ euros(support.priceTtcCents) }} · {{ copy.common.comingSoon }}</button>
            </template>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-8" aria-labelledby="fair-title">
      <h2 id="fair-title" class="text-2xl font-black text-white">{{ shop.fairTitle }}</h2>
      <ul class="mt-5 grid gap-3 text-sm text-zinc-300 md:grid-cols-2">
        <li v-for="rule in fairnessRules" :key="rule" class="flex gap-3 rounded-xl bg-zinc-900 p-4"><span aria-hidden="true" class="text-emerald-400">✓</span><span>{{ rule }}</span></li>
      </ul>
      <p class="mt-6 text-xs leading-relaxed text-zinc-500">Cookie Build · {{ copy.footer.legal }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ alias: ["/fr/shop", "/de/shop", "/it/shop", "/bg/shop", "/es/shop", "/hi/shop", "/pt-br/shop"] });
import { SHOP_COPY, SHOP_FAIRNESS, shopItemCopy } from "@/utils/shop-copy";
import { COSMETIC_CATALOG_RESPONSE } from "#shared/cosmetics-catalog";
import CosmeticPreview from "../../components/cosmetics/CosmeticPreview.vue";

const { data: catalogResponse } = await useFetch("/api/cosmetics/catalog", {
  key: "public-cosmetics-catalog",
});
const { locale, copy } = useSiteLocale();
const shop = computed(() => SHOP_COPY[locale.value.code]);
const shopAnalytics = useShopAnalytics();
let viewTracked = false;
function trackShopView() {
  if (!viewTracked) viewTracked = shopAnalytics.track("shop_view");
}
onMounted(trackShopView);
watch(shopAnalytics.consent, trackShopView);

const freeItem = computed(() => catalog.value.items.find((item) => item.id === "cookie_sparkle_trail"));
const catalog = computed(() => catalogResponse.value?.data ?? COSMETIC_CATALOG_RESPONSE);
const purchaseEnabled = computed(() => catalog.value.purchaseEnabled === true);
const subscriptionProduct = computed(() => catalog.value.products.find((product) => product.kind === "supporter_subscription")!);
const oneTimeProducts = computed(() => catalog.value.products.filter((product) => product.access === "permanent"));
const supportProducts = computed(() => catalog.value.products.filter((product) => product.kind === "voluntary_support"));

const subscriptionBenefits = computed(() => catalog.value.items.filter((item) => subscriptionProduct.value.grants.some((id) => id === item.id)));

const fairnessRules = computed(() => SHOP_FAIRNESS[locale.value.code]);
function itemText(item: { id: string; name: string; description: string }) {
  return shopItemCopy(locale.value.code, item);
}
function productText(product: { kind: string; name: string; description: string; grants: readonly string[] }) {
  if (product.kind === "supporter_rank") return { name: shop.value.rankTitle, description: shop.value.rankDescription };
  if (product.kind === "collection_pack") return { name: shop.value.packTitle, description: shop.value.packDescription };
  if (product.kind === "individual_cosmetic") {
    const item = catalog.value.items.find((candidate) => candidate.id === product.grants[0]);
    return { name: item ? itemText(item).name : product.name, description: shop.value.individualDescription };
  }
  return { name: product.name, description: product.description };
}

function euros(cents: number) {
  return new Intl.NumberFormat(locale.value.htmlLang, { style: "currency", currency: "EUR" }).format(cents / 100);
}

useLocalizedSeo("/shop", () => `${shop.value.title} | Cookie Build`, () => shop.value.intro);
</script>
