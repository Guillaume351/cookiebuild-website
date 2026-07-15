<template>
  <div>
    <AdminPageHeader title="Vue d’ensemble" description="État issu de PostgreSQL. Les surfaces temps réel et opérations apparaissent lorsque l’AdminBridge est disponible.">
      <button class="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold hover:border-orange-500" :disabled="pending" @click="refresh">Actualiser</button>
    </AdminPageHeader>
    <AdminNotice v-if="error" tone="error" class="mb-6">{{ adminErrorMessage(error) }}</AdminNotice>
    <div v-if="pending && !dashboard" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="index in 8" :key="index" class="h-32 animate-pulse rounded-2xl bg-zinc-900" />
    </div>
    <template v-else-if="dashboard">
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article v-for="metric in metrics" :key="metric.label" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
          <p class="text-sm font-semibold text-zinc-400">{{ metric.label }}</p>
          <p class="mt-2 text-4xl font-black" :class="metric.alert ? 'text-red-400' : 'text-white'">{{ metric.value }}</p>
          <p class="mt-2 text-xs text-zinc-500">{{ metric.hint }}</p>
        </article>
      </section>
      <section class="mt-8 grid gap-4 lg:grid-cols-3">
        <NuxtLink to="/admin/reports" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-orange-500/60">
          <h2 class="font-black text-white">Modération</h2><p class="mt-2 text-sm text-zinc-400">Traiter les signalements et documenter chaque décision.</p>
        </NuxtLink>
        <NuxtLink to="/admin/content" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-orange-500/60">
          <h2 class="font-black text-white">Publications</h2><p class="mt-2 text-sm text-zinc-400">Actualités, changelog et événements de l’application.</p>
        </NuxtLink>
        <NuxtLink to="/admin/notifications" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-orange-500/60">
          <h2 class="font-black text-white">Notifications mobiles</h2><p class="mt-2 text-sm text-zinc-400">Prévisualiser l’audience, programmer et suivre les envois.</p>
        </NuxtLink>
      </section>
      <p class="mt-6 text-right text-xs text-zinc-600">Calculé le {{ formatDate(dashboard.generatedAt) }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Vue d’ensemble admin | Cookie Build", robots: "noindex, nofollow" });
interface Dashboard {
  generatedAt: string;
  players: { online: number; unique24h: number };
  matches: { open: number; started24h: number };
  moderation: { openReports: number };
  notifications: { enabledDevices: number; pending: number; dead: number };
  content: { published: number };
}
const dashboard = ref<Dashboard | null>(null);
const pending = ref(true);
const error = ref<unknown>(null);
async function refresh() {
  pending.value = true; error.value = null;
  try { dashboard.value = (await adminRequest<{ data: Dashboard }>("/api/admin/dashboard")).data; }
  catch (caught) { error.value = caught; }
  finally { pending.value = false; }
}
await refresh();
const metrics = computed(() => dashboard.value ? [
  { label: "Joueurs en ligne", value: dashboard.value.players.online, hint: "Sessions sans date de fin", alert: false },
  { label: "Joueurs sur 24 h", value: dashboard.value.players.unique24h, hint: "Joueurs uniques", alert: false },
  { label: "Parties ouvertes", value: dashboard.value.matches.open, hint: "Matches non terminés", alert: false },
  { label: "Parties sur 24 h", value: dashboard.value.matches.started24h, hint: "Matches démarrés", alert: false },
  { label: "Signalements actifs", value: dashboard.value.moderation.openReports, hint: "Ouverts ou en revue", alert: dashboard.value.moderation.openReports > 0 },
  { label: "Mobiles joignables", value: dashboard.value.notifications.enabledDevices, hint: "Push autorisé", alert: false },
  { label: "Push en attente", value: dashboard.value.notifications.pending, hint: "Pending ou processing", alert: false },
  { label: "Push en échec", value: dashboard.value.notifications.dead, hint: "Dead letters à examiner", alert: dashboard.value.notifications.dead > 0 },
] : []);
const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
</script>
