<template>
  <div class="mx-auto max-w-3xl py-12">
    <LanguageFallbackNotice :available-locales="['fr']" />
    <p v-if="response?.data.commerce?.mode === 'test'" role="status" class="rounded-xl border border-sky-400/40 bg-sky-950/30 p-4 text-sky-100">Mode test : aucun paiement réel. Les accès de test ne sont pas des achats définitifs.</p>
    <NuxtLink to="/cosmetics" class="text-sm font-bold text-orange-300">← Catalogue public</NuxtLink>
    <section v-if="product" class="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-6 md:p-10">
      <p class="text-sm font-black uppercase tracking-widest text-orange-300">Commande sécurisée</p>
      <h1 class="mt-3 text-4xl font-black text-white">{{ product.name }}</h1>
      <p class="mt-3 text-zinc-400">{{ product.description }}</p>
      <p class="mt-6 text-3xl font-black text-white">{{ euros(product.priceTtcCents) }} TTC<span v-if="product.access === 'subscription'" class="text-base text-orange-200"> / mois</span></p>
      <p class="mt-4 rounded-xl border border-orange-400/20 bg-orange-950/20 p-4 text-sm text-orange-100">Destinataire : <strong>{{ linkedPlayer?.name || linkedPlayer?.id || "aucun joueur lié" }}</strong>. Pour acheter pour un autre joueur, <NuxtLink :to="connectPath" class="underline">génère un nouveau code en jeu</NuxtLink>.</p>
      <p class="mt-3 text-sm text-zinc-400">Le paiement et l’adresse de facturation sont saisis sur Stripe Checkout. Cookie Build ne reçoit pas les données de carte.</p>
      <form class="mt-8 space-y-4" @submit.prevent="checkout">
        <label class="flex items-start gap-3 rounded-xl border border-zinc-700 p-4"><input v-model="termsAccepted" type="checkbox" required class="mt-1 h-5 w-5" /><span>J’accepte les <NuxtLink to="/terms" target="_blank" class="text-orange-300 underline">CGV</NuxtLink> et confirme que cette commande m’oblige à payer le prix TTC affiché.</span></label>
        <template v-if="product.access === 'permanent'">
          <label class="flex items-start gap-3 rounded-xl border border-zinc-700 p-4"><input v-model="immediatePerformanceConsent" type="checkbox" required class="mt-1 h-5 w-5" /><span>Je demande expressément l’exécution immédiate et la livraison de l’accès numérique avant la fin du délai de rétractation.</span></label>
          <label class="flex items-start gap-3 rounded-xl border border-zinc-700 p-4"><input v-model="withdrawalWaiverAcknowledged" type="checkbox" required class="mt-1 h-5 w-5" /><span>Je reconnais perdre mon droit de rétractation dès que l’accès numérique acheté est livré.</span></label>
        </template>
        <p v-if="product.access === 'subscription'" class="rounded-xl border border-sky-500/20 bg-sky-950/20 p-4 text-sm text-sky-100">Abonnement mensuel résiliable via le portail. Une rétractation initiale de 14 jours avec remboursement intégral et annulation immédiate est disponible dans l’historique.</p>
        <p v-if="product.access === 'none'" class="rounded-xl border border-sky-500/20 bg-sky-950/20 p-4 text-sm text-sky-100">Ce soutien libre est répétable et n’accorde aucun rang, cosmétique ni avantage exclusif.</p>
        <p v-if="error" role="alert" class="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-red-200">{{ error }}</p>
        <button :disabled="loading || !catalog.purchaseEnabled || !linkedPlayer || !consentComplete" class="min-h-12 w-full rounded-xl bg-orange-500 px-5 py-3 font-black text-zinc-950 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50">{{ loading ? "Ouverture du paiement…" : cta }}</button>
      </form>
      <p v-if="!catalog.purchaseEnabled" class="mt-4 text-center text-sm text-zinc-500">{{ response?.data.commerce?.message || "Les achats sont indisponibles." }}</p>
    </section>
    <p v-else class="mt-8 rounded-xl border border-red-500/30 p-5 text-red-200">Produit inconnu.</p>
  </div>
</template>

<script setup lang="ts">
import { COSMETIC_CATALOG_RESPONSE } from "#shared/cosmetics-catalog";
const route = useRoute();
const nuxtApp = useNuxtApp();
const { data: response } = await useFetch("/api/cosmetics/catalog");
const catalog = computed(() => response.value?.data ?? COSMETIC_CATALOG_RESPONSE);
const product = computed(() => catalog.value.products.find((entry) => entry.id === route.query.product));
const linkedPlayer = useCommercePlayer();
const termsAccepted = ref(false);
const immediatePerformanceConsent = ref(false);
const withdrawalWaiverAcknowledged = ref(false);
const loading = ref(false);
const error = ref("");
const connectPath = computed(() => `/cosmetics/connect?next=${encodeURIComponent(route.fullPath)}`);
const consentComplete = computed(() => termsAccepted.value && (product.value?.access !== "permanent" || (immediatePerformanceConsent.value && withdrawalWaiverAcknowledged.value)));
watch(() => product.value?.id, () => { termsAccepted.value = false; immediatePerformanceConsent.value = false; withdrawalWaiverAcknowledged.value = false; error.value = ""; });
const euros = (cents: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
const cta = computed(() => {
  if (!product.value) return "Produit indisponible";
  const verb = product.value.access === "subscription" ? "S’abonner et payer" : product.value.access === "none" ? "Soutenir et payer" : "Acheter et payer";
  return `${verb} ${euros(product.value.priceTtcCents)}${product.value.access === "subscription" ? " / mois" : ""}`;
});
async function checkout() {
  if (!product.value || loading.value || !catalog.value.purchaseEnabled || !consentComplete.value || !linkedPlayer.value) return;
  loading.value = true; error.value = "";
  try {
    const result = await commerceRequest<{ data: { url: string } }>("/api/commerce/checkout", { method: "POST", body: {
      productId: product.value.id, termsAccepted: termsAccepted.value,
      immediatePerformanceConsent: immediatePerformanceConsent.value,
      withdrawalWaiverAcknowledged: withdrawalWaiverAcknowledged.value,
    } });
    window.location.assign(result.data.url);
  } catch (caught) {
    if (commerceUnauthorized(caught)) { linkedPlayer.value = null; await nuxtApp.runWithContext(() => navigateTo(connectPath.value)); }
    else error.value = commerceErrorMessage(caught);
  } finally { loading.value = false; }
}
try { linkedPlayer.value = (await loadCommerceSession()).player; }
catch (caught) {
  linkedPlayer.value = null;
  if (commerceUnauthorized(caught)) {
    if (catalog.value.purchaseEnabled) await nuxtApp.runWithContext(() => navigateTo(connectPath.value));
  }
  else error.value = commerceErrorMessage(caught);
}
useSeoMeta({ title: "Commande | Cookie Build", robots: "noindex, nofollow" });
</script>
