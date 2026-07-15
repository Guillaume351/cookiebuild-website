<template>
  <div>
    <AdminPageHeader title="Observabilité" description="Métriques Prometheus et logs Loki via des requêtes strictement prédéfinies.">
      <button class="rounded-xl border border-zinc-700 px-4 py-2 text-sm" :disabled="loading" @click="refresh">Actualiser</button>
    </AdminPageHeader>
    <AdminNotice v-if="notice" :tone="noticeTone" class="mb-6">{{ notice }}</AdminNotice>
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article v-for="(metric, key) in metrics" :key="key" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><p class="text-sm text-zinc-400">{{ labels[key] || key }}</p><p class="mt-2 break-all text-2xl font-black">{{ metricValue(metric) }}</p></article>
    </section>
    <section class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article v-for="item in analyticCards" :key="item.label" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><p class="text-sm text-zinc-400">{{ item.label }}</p><p class="mt-2 text-2xl font-black">{{ item.value }}</p></article>
    </section>
    <section v-if="analytics.available" class="mt-8 grid gap-6 xl:grid-cols-2">
      <details class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><summary class="cursor-pointer font-black">Sessions et joueurs actifs · 24 h</summary><pre class="mt-4 max-h-96 overflow-auto text-xs text-zinc-400">{{ JSON.stringify(analytics.usageHourly, null, 2) }}</pre></details>
      <details class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><summary class="cursor-pointer font-black">Parties terminées par jeu · 24 h</summary><pre class="mt-4 max-h-96 overflow-auto text-xs text-zinc-400">{{ JSON.stringify(analytics.matchesHourly, null, 2) }}</pre></details>
    </section>
    <section class="mt-8">
      <div class="mb-3 flex flex-wrap items-center gap-3"><h2 class="mr-auto text-xl font-black">Logs Minecraft</h2><select v-model="logKey" aria-label="Type de logs" class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" @change="loadLogs"><option value="recent">Récents</option><option value="errors">Erreurs</option><option value="warnings">Avertissements</option><option value="admin">Actions admin</option></select><select v-model="sinceMinutes" aria-label="Période des logs" class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" @change="loadLogs"><option :value="15">15 min</option><option :value="60">1 h</option><option :value="360">6 h</option><option :value="1440">24 h</option></select><button class="rounded-lg border border-zinc-700 px-3 py-2 text-sm" @click="copyLogs">Copier les logs</button></div>
      <pre class="max-h-[620px] overflow-auto whitespace-pre-wrap rounded-2xl border border-zinc-800 bg-black p-5 font-mono text-xs leading-6 text-zinc-300">{{ formattedLogs || "Aucune ligne retournée." }}</pre>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Observabilité admin | Cookie Build", robots: "noindex, nofollow" });
type MetricResponse = Record<string, { ok: boolean; response: { data?: { result?: Array<{ value?: unknown[] }> } } | null }>;
interface Analytics { available: boolean; summary: Record<string, number> | null; usageHourly: unknown[]; matchesHourly: unknown[] }
const metrics = ref<MetricResponse>({}); const logs = ref<Record<string, unknown> | null>(null); const analytics = ref<Analytics>({ available: false, summary: null, usageHourly: [], matchesHourly: [] }); const loading = ref(false); const logKey = ref("errors"); const sinceMinutes = ref(60); const notice = ref(""); const noticeTone = ref<"error" | "success">("success");
const labels: Record<string, string> = { players_java: "Joueurs Java", players_bedrock: "Joueurs Bedrock", minecraft_mspt: "MSPT Minecraft", monitor_latency: "Latence moniteur", host_cpu_ratio: "CPU hôte", host_memory_available: "Mémoire disponible", host_memory_used_ratio: "Mémoire utilisée", host_disk_available_ratio: "Disque disponible", host_disk_used_ratio: "Disque utilisé", funnel_24h: "Funnel activation · 24 h", active_alerts: "Alertes actives", update_available: "Mises à jour" };
function metricValue(metric: MetricResponse[string]) { if (!metric?.ok) return "Indisponible"; const value = metric.response?.data?.result?.[0]?.value?.[1]; return value === undefined ? "—" : String(value); }
const formattedLogs = computed(() => logs.value ? JSON.stringify(logs.value, null, 2) : "");
const analyticCards = computed(() => { const value = analytics.value.summary; return value ? [{ label: "Actifs · 24 h", value: value.active24h }, { label: "Actifs · 7 j", value: value.active7d }, { label: "Nouveaux · 7 j", value: value.new7d }, { label: "Parties · 24 h", value: value.matches24h }, { label: "Parties · 7 j", value: value.matches7d }, { label: "Session P50 · 7 j", value: `${value.sessionP50Minutes ?? "—"} min` }, { label: "Session P90 · 7 j", value: `${value.sessionP90Minutes ?? "—"} min` }] : []; });
async function loadMetrics() { metrics.value = (await adminRequest<{ data: MetricResponse }>("/api/admin/metrics")).data; }
async function loadAnalytics() { analytics.value = (await adminRequest<{ data: Analytics }>("/api/admin/analytics")).data; }
async function loadLogs() { logs.value = (await adminRequest<{ data: Record<string, unknown> }>(`/api/admin/logs?key=${logKey.value}&sinceMinutes=${sinceMinutes.value}&limit=500`)).data; }
async function refresh() { loading.value = true; notice.value = ""; const results = await Promise.allSettled([loadMetrics(), loadAnalytics(), loadLogs()]); if (results.some((result) => result.status === "rejected") || !analytics.value.available) { notice.value = "Une partie de la télémétrie est indisponible."; noticeTone.value = "error"; } loading.value = false; }
async function copyLogs() { try { await navigator.clipboard.writeText(formattedLogs.value); notice.value = "Logs assainis copiés."; noticeTone.value = "success"; } catch { notice.value = "Impossible de copier les logs."; noticeTone.value = "error"; } }
await refresh();
</script>
