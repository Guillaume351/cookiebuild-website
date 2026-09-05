<template>
  <div>
    <AdminPageHeader title="Commerce" description="Commandes, abonnements, paiements et événements Stripe sans données de carte.">
      <button class="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold hover:border-orange-500" :disabled="busy" @click="load">Actualiser</button>
    </AdminPageHeader>
    <AdminNotice v-if="error" tone="error" class="mb-5">{{ error }}</AdminNotice>
    <AdminNotice v-else-if="data && !data.readiness.ready" tone="info" class="mb-5">
      Checkout désactivé : {{ data.readiness.reasons.join(" · ") }}
    </AdminNotice>
    <section class="grid gap-4 md:grid-cols-4" aria-label="Synthèse commerce">
      <div v-for="metric in metrics" :key="metric.label" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><p class="text-sm text-zinc-500">{{ metric.label }}</p><p class="mt-2 text-3xl font-black">{{ metric.value }}</p></div>
    </section>
    <section class="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900" aria-labelledby="orders-title">
      <h2 id="orders-title" class="px-5 py-4 text-xl font-black">Commandes récentes</h2>
      <div class="overflow-x-auto"><table class="w-full min-w-[980px] text-left text-sm"><thead class="bg-zinc-950 text-xs uppercase text-zinc-500"><tr><th class="px-5 py-3">Date</th><th class="px-5 py-3">Produit</th><th class="px-5 py-3">Joueur</th><th class="px-5 py-3">Montant</th><th class="px-5 py-3">Statut</th><th class="px-5 py-3">Retrait</th><th class="px-5 py-3">Action</th></tr></thead><tbody class="divide-y divide-zinc-800"><tr v-for="order in data?.orders || []" :key="order.id"><td class="px-5 py-4 text-zinc-400">{{ formatDate(order.createdAt) }}</td><td class="px-5 py-4"><p class="font-bold">{{ order.productName }}</p><p class="font-mono text-xs text-zinc-600">{{ order.id }}</p></td><td class="px-5 py-4 font-mono text-xs">{{ order.playerId }}</td><td class="px-5 py-4">{{ euros(order.amountTtcCents) }}</td><td class="px-5 py-4">{{ order.status }}</td><td class="px-5 py-4">{{ order.withdrawalStatus }}</td><td class="px-5 py-4"><button v-if="canWrite && refundablePayment(order.id)" class="rounded border border-red-500/30 px-3 py-1 text-red-200" :disabled="busy" @click="refund(order)">Rembourser le paiement disponible</button><span v-else>—</span></td></tr></tbody></table></div>
    </section>
    <section class="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900" aria-labelledby="events-title">
      <div class="flex items-center justify-between px-5 py-4"><h2 id="events-title" class="text-xl font-black">Webhooks à traiter</h2><button v-if="canWrite" class="rounded-lg border border-zinc-700 px-3 py-2 text-sm" :disabled="busy" @click="reconcile">Relancer les événements en attente</button></div>
      <ul class="divide-y divide-zinc-800"><li v-for="entry in data?.webhookEvents || []" :key="entry.stripeEventId" class="flex flex-wrap items-center gap-3 px-5 py-4 text-sm"><code>{{ entry.stripeEventId }}</code><span>{{ entry.eventType }}</span><span class="text-red-300">{{ entry.status }} · {{ entry.lastError || "verrou en cours" }}</span><button v-if="canWrite" class="ml-auto rounded border border-zinc-700 px-3 py-1" :disabled="busy" @click="retry(entry.stripeEventId)">Relancer</button></li><li v-if="!data?.webhookEvents.length" class="px-5 py-6 text-zinc-500">Aucun événement à relancer.</li></ul>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Commerce admin | Cookie Build", robots: "noindex, nofollow" });
const canWrite = useAdminAccess("commerce:write");
interface AdminCommerceOrder { id: string; playerId: string; productName: string; amountTtcCents: number; status: string; withdrawalStatus: string; createdAt: string }
interface AdminCommercePayment { id: string; orderId: string; amountCents: number; refundedAmountCents: number; status: string; paidAt: string | null }
interface AdminCommerceData {
  readiness: { ready: boolean; reasons: string[] };
  orders: AdminCommerceOrder[];
  subscriptions: unknown[];
  payments: AdminCommercePayment[];
  webhookEvents: Array<{ stripeEventId: string; eventType: string; status: string; lastError: string | null }>;
}
const data = ref<AdminCommerceData | null>(null);
const error = ref("");
const busy = ref(false);
const metrics = computed(() => [
  { label: "Commandes récentes (max. 200)", value: data.value?.orders.length || 0 },
  { label: "Abonnements récents (max. 200)", value: data.value?.subscriptions.length || 0 },
  { label: "Paiements récents (max. 200)", value: data.value?.payments.length || 0 },
  { label: "Webhooks en erreur", value: data.value?.webhookEvents.length || 0 },
]);
async function refresh() {
  data.value = (await adminRequest<{ data: AdminCommerceData }>("/api/admin/commerce")).data;
}
async function run(work: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true; error.value = "";
  try { await work(); } catch (caught) { error.value = adminErrorMessage(caught); }
  finally { busy.value = false; }
}
async function load() { await run(refresh); }
function actionReason(label: string) {
  const reason = window.prompt(label)?.trim();
  if (!reason) return null;
  if (reason.length < 8) { error.value = "Le motif doit contenir au moins 8 caractères."; return null; }
  return reason;
}
async function retry(eventId: string) {
  const reason = actionReason("Motif de la relance (8 caractères minimum)");
  if (!reason) return;
  await run(async () => { await adminRequest(`/api/admin/commerce/events/${encodeURIComponent(eventId)}/retry`, { method: "POST", body: { reason } }); await refresh(); });
}
async function reconcile() {
  const reason = actionReason("Motif de la réconciliation (8 caractères minimum)");
  if (!reason) return;
  await run(async () => { await adminRequest("/api/admin/commerce/reconcile", { method: "POST", body: { reason } }); await refresh(); });
}
function refundablePayment(orderId: string) {
  return data.value?.payments.filter((payment) => payment.orderId === orderId && ["succeeded", "partially_refunded"].includes(payment.status) && payment.amountCents > payment.refundedAmountCents)
    .sort((a, b) => new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime())[0];
}
async function refund(order: AdminCommerceOrder) {
  const payment = refundablePayment(order.id);
  if (!payment || !window.confirm(`Rembourser le solde de ${euros(payment.amountCents - payment.refundedAmountCents)} pour ${order.productName} ? L’accès sera mis à jour après confirmation du remboursement.`)) return;
  const reason = actionReason("Motif du remboursement (8 caractères minimum)");
  if (!reason) return;
  await run(async () => { await adminRequest(`/api/admin/commerce/orders/${order.id}/refund`, { method: "POST", body: { reason } }); await refresh(); });
}
const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const euros = (cents: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
await load();
</script>
