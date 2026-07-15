<template>
  <div>
    <AdminPageHeader title="Journal d’audit" description="Historique append-only des connexions et actions administratives.">
      <button class="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold hover:border-orange-500" @click="load">Actualiser</button>
    </AdminPageHeader>
    <AdminNotice v-if="error" tone="error" class="mb-5">{{ error }}</AdminNotice>
    <div class="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[850px] text-left text-sm">
          <thead class="bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500"><tr><th class="px-5 py-4">Date</th><th class="px-5 py-4">Administrateur</th><th class="px-5 py-4">Action</th><th class="px-5 py-4">Ressource</th><th class="px-5 py-4">Contexte</th></tr></thead>
          <tbody class="divide-y divide-zinc-800"><tr v-for="entry in entries" :key="entry.id" class="align-top"><td class="whitespace-nowrap px-5 py-4 text-zinc-400">{{ formatDate(entry.createdAt) }}</td><td class="px-5 py-4"><p class="font-bold text-white">{{ entry.actorDisplayName || entry.actorEmail }}</p><p class="text-xs uppercase text-zinc-500">{{ entry.actorRole }}</p></td><td class="px-5 py-4 font-mono text-xs text-orange-300">{{ entry.action }}</td><td class="px-5 py-4"><p>{{ entry.resourceType }}</p><p class="max-w-48 truncate text-xs text-zinc-500">{{ entry.resourceId }}</p></td><td class="px-5 py-4"><pre class="max-w-sm whitespace-pre-wrap break-words text-xs text-zinc-400">{{ pretty(entry.metadata) }}</pre><p v-if="entry.requestId" class="mt-2 text-[10px] text-zinc-600">request {{ entry.requestId }}</p></td></tr></tbody>
        </table>
      </div>
      <p v-if="loading" class="p-8 text-zinc-500">Chargement…</p><p v-else-if="!entries.length" class="p-8 text-zinc-500">Aucune entrée d’audit.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Audit admin | Cookie Build", robots: "noindex, nofollow" });
interface AuditEntry { id: string; actorEmail: string; actorDisplayName: string | null; actorRole: string; action: string; resourceType: string; resourceId: string | null; requestId: string | null; metadata: Record<string, unknown>; createdAt: string }
const entries = ref<AuditEntry[]>([]); const loading = ref(true); const error = ref("");
async function load() { loading.value = true; error.value = ""; try { entries.value = (await adminRequest<{ data: AuditEntry[] }>("/api/admin/audit")).data; } catch (caught) { error.value = adminErrorMessage(caught); } finally { loading.value = false; } }
const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
const pretty = (value: Record<string, unknown>) => Object.keys(value || {}).length ? JSON.stringify(value, null, 2) : "—";
await load();
</script>
