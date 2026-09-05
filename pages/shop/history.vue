<template>
  <div class="mx-auto max-w-5xl py-12">
    <LanguageFallbackNotice :available-locales="['fr']" />
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div><p class="text-sm font-black uppercase text-orange-300">Espace joueur</p><h1 class="mt-2 text-4xl font-black">Inventaire et historique</h1><p class="mt-2 text-zinc-400">{{ player?.name || "Joueur lié" }}</p></div>
      <div class="flex flex-wrap gap-3">
        <NuxtLink to="/shop" class="rounded-xl border border-zinc-700 px-4 py-3 font-bold">Catalogue</NuxtLink>
        <button :disabled="busy" class="rounded-xl border border-zinc-700 px-4 py-3 font-bold disabled:opacity-50" @click="load">Actualiser</button>
        <button :disabled="busy" class="rounded-xl border border-red-500/30 px-4 py-3 font-bold text-red-200 disabled:opacity-50" @click="logout">Déconnecter ce joueur</button>
      </div>
    </div>
    <p v-if="error" role="alert" class="mt-6 rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-red-200">{{ error }}</p>
    <p v-if="notice" role="status" class="mt-6 rounded-xl border border-emerald-500/30 p-4 text-emerald-200">{{ notice }}</p>
    <p v-if="loading" role="status" class="mt-6 text-zinc-400">Chargement de ton espace…</p>
    <template v-if="inventory && history">
      <section class="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6" aria-labelledby="subscription-title">
        <h2 id="subscription-title" class="text-2xl font-black">Abonnements</h2>
        <article v-for="subscription in history.subscriptions" :key="subscription.orderId" class="mt-4 rounded-xl bg-zinc-950 p-4">
          <h3 class="font-bold">{{ orderName(subscription.orderId) }} · {{ commerceStatusLabel(subscription.status) }}</h3>
          <p class="mt-2 text-sm text-zinc-300">{{ commerceSubscriptionSummary(subscription) }}</p>
          <p v-if="subscription.currentPeriodEnd" class="mt-2 text-sm text-zinc-400">Fin de la période enregistrée : {{ formatDate(subscription.currentPeriodEnd) }}</p>
          <p class="mt-2 text-xs text-zinc-500">Les accès utilisables sont indiqués dans ton inventaire ci-dessous.</p>
        </article>
        <p v-if="!history.subscriptions.length" class="mt-4 text-zinc-400">Aucun abonnement enregistré.</p>
        <button v-if="history.orders.length" :disabled="busy" class="mt-5 min-h-11 rounded-xl border border-orange-400/50 px-4 py-3 font-bold text-orange-200 disabled:opacity-50" @click="portal">Gérer les paiements ou résilier sur Stripe</button>
      </section>
      <section class="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6" aria-labelledby="inventory-title">
        <h2 id="inventory-title" class="text-2xl font-black">Accès actifs</h2>
        <p class="mt-2 text-sm text-zinc-400">Choisis les effets à activer. Le vol et les effets de lobby restent réservés au lobby ; le cadre apparaît sur le site.</p>
        <ul class="mt-4 grid gap-4 md:grid-cols-2">
          <li v-for="entry in inventory.entitlements" :key="entry.cosmeticId" class="overflow-hidden rounded-xl bg-zinc-950 p-4">
            <CosmeticPreview v-if="entry.item" :item="entry.item" />
            <h3 class="mt-4 font-bold">{{ entry.item?.name || entry.cosmeticId }}</h3>
            <p class="mt-1 text-sm text-zinc-400">{{ entry.item && "free" in entry.item && entry.item.free ? "Offert à tous · sans achat" : entry.expiresAt ? `Accès jusqu’au ${formatDate(entry.expiresAt)}` : "Accès permanent" }}</p>
            <p v-if="entry.item?.slot === 'JOIN_FLAIR'" class="mt-4 rounded-xl border border-emerald-400/30 p-3 text-sm text-emerald-200">Automatique à la connexion tant que cet accès est actif.</p>
            <button v-else-if="entry.item" :disabled="busy" :aria-pressed="isSelected(entry.cosmeticId)" class="mt-4 min-h-11 w-full rounded-xl border px-4 py-3 font-bold disabled:opacity-50" :class="isSelected(entry.cosmeticId) ? 'border-emerald-400 text-emerald-200' : 'border-orange-400/50 text-orange-200'" @click="select(entry)">{{ isSelected(entry.cosmeticId) ? "Activé · Désactiver" : "Activer" }}</button>
          </li>
        </ul>
        <p v-if="!inventory.entitlements.length" class="mt-4 text-zinc-400">Aucun accès actif. Découvre les effets dans le <NuxtLink to="/shop" class="text-orange-300 underline">catalogue</NuxtLink>.</p>
      </section>
      <section class="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6" aria-labelledby="orders-title">
        <div class="flex flex-wrap items-center justify-between gap-3"><h2 id="orders-title" class="text-2xl font-black">Commandes</h2><button v-if="history.orders.length" class="min-h-11 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold" @click="downloadHistory">Télécharger mon historique</button></div>
        <div class="mt-4 space-y-4">
          <article v-for="order in history.orders" :key="order.id" class="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <div class="flex flex-wrap justify-between gap-3"><div><h3 class="font-black">{{ order.productName }}</h3><p class="mt-1 text-sm text-zinc-400">{{ formatDate(order.createdAt) }} · {{ commerceStatusLabel(order.status) }}</p></div><strong>{{ euros(order.amountTtcCents) }}</strong></div>
            <p class="mt-3 break-all text-xs text-zinc-400">Référence : {{ order.id }}</p>
            <ul class="mt-3 space-y-2 text-sm text-zinc-300"><li v-for="payment in history.payments.filter((payment) => payment.order_id === order.id)" :key="payment.id">{{ formatDate(payment.paid_at || payment.created_at) }} · {{ euros(payment.amount_cents) }} · {{ commerceStatusLabel(payment.status) }}<span v-if="payment.refunded_amount_cents"> · Remboursé : {{ euros(payment.refunded_amount_cents) }}</span></li></ul>
            <details class="mt-4 text-sm text-zinc-400"><summary class="min-h-11 cursor-pointer py-3">Informations et consentements de commande</summary><pre class="whitespace-pre-wrap break-words font-sans">{{ order.noticeText }}</pre><p class="mt-2 text-xs">Version {{ order.noticeVersion }} · accepté le {{ formatDate(order.termsAcceptedAt) }}</p></details>
            <button v-if="withdrawalEligible(order)" :disabled="busy" class="mt-4 min-h-11 rounded-lg border border-sky-500/30 px-4 py-3 text-sm font-bold text-sky-200 disabled:opacity-50" @click="withdraw(order.id)">Demander la rétractation initiale et le remboursement intégral</button>
          </article>
          <p v-if="!history.orders.length" class="text-zinc-400">Aucune commande.</p>
        </div>
      </section>
    </template>
    <p class="mt-8 text-sm text-zinc-400">Besoin d’aide ? <NuxtLink to="/support" class="text-orange-300 underline">Contacte le support</NuxtLink> avec ta référence de commande.</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ alias: ["/fr/shop/history", "/de/shop/history", "/it/shop/history", "/bg/shop/history", "/es/shop/history", "/hi/shop/history", "/pt-br/shop/history"] });
import CosmeticPreview from "../../components/cosmetics/CosmeticPreview.vue";
import type { CommerceEntitlement, CommerceHistory, CommerceInventory, CommerceOrder } from "../../composables/useCommerce";

const nuxtApp = useNuxtApp();
const player = useCommercePlayer();
const inventory = ref<CommerceInventory | null>(null);
const history = ref<CommerceHistory | null>(null);
const error = ref("");
const notice = ref("");
const loading = ref(false);
const action = ref(false);
const busy = computed(() => loading.value || action.value);
async function handleError(caught: unknown) {
  if (commerceUnauthorized(caught)) {
    player.value = null;
    await nuxtApp.runWithContext(() => navigateTo("/shop/connect?next=/shop/history"));
  } else error.value = commerceErrorMessage(caught);
}
async function load() {
  if (loading.value) return;
  loading.value = true;
  error.value = "";
  try {
    player.value = (await loadCommerceSession()).player;
    const [items, orders] = await Promise.all([
      commerceRequest<{ data: CommerceInventory }>("/api/commerce/inventory"),
      commerceRequest<{ data: CommerceHistory }>("/api/commerce/history"),
    ]);
    inventory.value = items.data;
    history.value = orders.data;
  } catch (caught) { inventory.value = null; history.value = null; await handleError(caught); }
  finally { loading.value = false; }
}
async function perform(work: () => Promise<void>) {
  if (busy.value) return;
  action.value = true; error.value = ""; notice.value = "";
  try { await work(); } catch (caught) { await handleError(caught); }
  finally { action.value = false; }
}
async function portal() {
  await perform(async () => {
    const result = await commerceRequest<{ data: { url: string } }>("/api/commerce/portal", { method: "POST" });
    window.location.assign(result.data.url);
  });
}
async function logout() {
  await perform(async () => {
    await commerceRequest("/api/commerce/session", { method: "DELETE" });
    player.value = null;
    await nuxtApp.runWithContext(() => navigateTo("/shop/connect"));
  });
}
const isSelected = (cosmeticId: string) => inventory.value?.selections.some((selection) => selection.cosmeticId === cosmeticId) === true;
async function select(entry: CommerceEntitlement) {
  if (!entry.item || entry.item.slot === "JOIN_FLAIR") return;
  const slot = entry.item.slot;
  await perform(async () => {
    await commerceRequest("/api/commerce/selections", { method: "PUT", body: { slot, cosmeticId: isSelected(entry.cosmeticId) ? null : entry.cosmeticId } });
    await load();
    if (!error.value) notice.value = "Ton choix a été enregistré.";
  });
}
async function withdraw(id: string) {
  if (!window.confirm("Confirmer la rétractation, l’annulation immédiate de l’abonnement et le remboursement intégral ?")) return;
  await perform(async () => {
    await commerceRequest(`/api/commerce/orders/${id}/withdraw`, { method: "POST" });
    await load();
    if (!error.value) notice.value = "Demande enregistrée. Le statut du remboursement sera mis à jour après confirmation.";
  });
}
const withdrawalEligible = (order: CommerceOrder) => order.access === "subscription" && order.withdrawalStatus === "eligible" && order.withdrawalDeadline && new Date(order.withdrawalDeadline).getTime() > Date.now();
const orderName = (id: string) => history.value?.orders.find((order) => order.id === id)?.productName || "Abonnement Supporter";
const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const euros = (cents: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
function downloadHistory() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(history.value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = "cookie-build-commandes.json"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
await load();
useSeoMeta({ title: "Historique des achats | Cookie Build", robots: "noindex, nofollow" });
</script>
