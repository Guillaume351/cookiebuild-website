<template>
  <div>
    <AdminPageHeader
      title="Économie Skyblock"
      description="Liquidité, monnaie créée ou détruite, marché, marchand et invariants de stockage."
    >
      <button class="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold hover:border-orange-500" :disabled="loading" @click="refresh">
        Actualiser
      </button>
    </AdminPageHeader>

    <AdminNotice v-if="error" tone="error" class="mb-6">{{ adminErrorMessage(error) }}</AdminNotice>
    <AdminNotice v-else-if="dashboard && !dashboard.available" tone="error" class="mb-6">
      Les métriques Skyblock V2 seront disponibles après application de la migration économique.
    </AdminNotice>

    <template v-if="dashboard?.available && dashboard.summary">
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article v-for="metric in metrics" :key="metric.label" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p class="text-sm font-semibold text-zinc-400">{{ metric.label }}</p>
          <p class="mt-2 text-3xl font-black" :class="metric.alert ? 'text-red-400' : 'text-white'">{{ metric.value }}</p>
          <p class="mt-2 text-xs text-zinc-500">{{ metric.hint }}</p>
        </article>
      </section>

      <section class="mt-8 grid gap-6 xl:grid-cols-2">
        <article class="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <header class="border-b border-zinc-800 p-5"><h2 class="font-black">Sources et dépenses · 7 jours</h2></header>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="text-zinc-500"><tr><th class="p-4">Cause</th><th class="p-4">Créées</th><th class="p-4">Détruites</th><th class="p-4">Opérations</th></tr></thead>
              <tbody><tr v-for="source in dashboard.sources" :key="source.source" class="border-t border-zinc-800"><td class="p-4 font-mono text-xs">{{ source.source }}</td><td class="p-4 text-emerald-300">{{ source.minted }}</td><td class="p-4 text-orange-300">{{ source.burned }}</td><td class="p-4">{{ source.transactions }}</td></tr></tbody>
            </table>
          </div>
        </article>

        <article class="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <header class="border-b border-zinc-800 p-5"><h2 class="font-black">Prix et liquidité · 7 jours</h2></header>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="text-zinc-500"><tr><th class="p-4">Objet</th><th class="p-4">Ventes</th><th class="p-4">Quantité</th><th class="p-4">Prix unité médian</th></tr></thead>
              <tbody><tr v-for="item in dashboard.items" :key="item.itemId" class="border-t border-zinc-800"><td class="p-4 font-semibold">{{ item.itemId }}</td><td class="p-4">{{ item.sales }}</td><td class="p-4">{{ item.quantity }}</td><td class="p-4">{{ item.medianUnitPrice }}</td></tr></tbody>
            </table>
          </div>
        </article>
      </section>
      <p class="mt-6 text-right text-xs text-zinc-600">Calculé le {{ formatDate(dashboard.generatedAt) }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Économie Skyblock admin | Cookie Build", robots: "noindex, nofollow" });

interface EconomySummary {
  islands: number;
  active24h: number;
  active7d: number;
  players: number;
  totalBalance: number;
  medianBalance: number;
  largestBalance: number;
  minted24h: number;
  burned24h: number;
  activeListings: number;
  overdueListings: number;
  sales24h: number;
  volume24h: number;
  npcSoldToday: number;
  npcBoughtToday: number;
  storageInvariantViolations: number;
}

interface Dashboard {
  available: boolean;
  generatedAt: string;
  summary: EconomySummary | null;
  sources: Array<{ source: string; minted: number; burned: number; transactions: number }>;
  items: Array<{ itemId: string; sales: number; quantity: number; volume: number; weightedUnitPrice: number; medianUnitPrice: number }>;
}

const dashboard = ref<Dashboard | null>(null);
const loading = ref(true);
const error = ref<unknown>(null);

async function refresh() {
  loading.value = true;
  error.value = null;
  try {
    dashboard.value = (await adminRequest<{ data: Dashboard }>("/api/admin/skyblock-economy")).data;
  } catch (caught) {
    error.value = caught;
  } finally {
    loading.value = false;
  }
}

const metrics = computed(() => {
  const value = dashboard.value?.summary;
  if (!value) return [];
  return [
    { label: "Îles actives · 24 h", value: value.active24h, hint: `${value.active7d} sur 7 jours`, alert: false },
    { label: "Joueurs Skyblock", value: value.players, hint: `${value.islands} îles`, alert: false },
    { label: "Masse monétaire", value: value.totalBalance, hint: `Médiane ${value.medianBalance}`, alert: false },
    { label: "Plus grande banque", value: value.largestBalance, hint: "Surveiller la concentration", alert: value.totalBalance > 0 && value.largestBalance / value.totalBalance > 0.5 },
    { label: "Pièces créées · 24 h", value: value.minted24h, hint: "Toutes sources Skyblock", alert: false },
    { label: "Pièces détruites · 24 h", value: value.burned24h, hint: "Améliorations et frais", alert: false },
    { label: "Ventes · 24 h", value: value.sales24h, hint: `${value.volume24h} pièces de volume`, alert: false },
    { label: "Annonces actives", value: value.activeListings, hint: `${value.overdueListings} expirées non résolues`, alert: value.overdueListings > 0 },
    { label: "Vendu au marchand", value: value.npcSoldToday, hint: "Unités aujourd’hui", alert: false },
    { label: "Acheté au marchand", value: value.npcBoughtToday, hint: "Unités aujourd’hui", alert: false },
    { label: "Invariants stockage", value: value.storageInvariantViolations, hint: "Doit toujours rester à zéro", alert: value.storageInvariantViolations > 0 },
  ];
});

const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
await refresh();
</script>
