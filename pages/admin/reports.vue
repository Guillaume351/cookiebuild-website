<template>
  <div>
    <AdminPageHeader title="Signalements" description="File de modération commune aux signalements de l’application mobile.">
      <select v-model="status" aria-label="Filtrer les signalements par statut" class="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm" @change="load">
        <option value="active">À traiter</option><option value="open">Ouverts</option><option value="reviewing">En revue</option><option value="resolved">Résolus</option><option value="dismissed">Classés</option><option value="all">Tous</option>
      </select>
    </AdminPageHeader>
    <AdminNotice v-if="message" :tone="messageTone" class="mb-5">{{ message }}</AdminNotice>
    <div v-if="loading" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">Chargement…</div>
    <div v-else-if="!reports.length" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">Aucun signalement dans cette file.</div>
    <div v-else class="grid gap-4 xl:grid-cols-2">
      <article v-for="report in reports" :key="report.id" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div><p class="font-black text-white">{{ report.reportedName || report.reportedPlayerId }}</p><p class="text-xs text-zinc-500">Signalé par {{ report.reporterName || report.reporterPlayerId }}</p></div>
          <span class="rounded-full border border-zinc-700 px-3 py-1 text-xs font-bold uppercase" :class="statusClass(report.status)">{{ labelStatus(report.status) }}</span>
        </div>
        <p class="mt-4 rounded-xl bg-zinc-950 p-3 text-sm text-zinc-300">Motif : <strong>{{ report.reason }}</strong></p>
        <p class="mt-3 text-xs text-zinc-500">{{ formatDate(report.createdAt) }} · ID {{ report.id }}</p>
        <p v-if="report.resolutionNote" class="mt-3 text-sm text-zinc-400">Conclusion : {{ report.resolutionNote }}</p>
        <form v-if="canWrite" class="mt-5 space-y-3 border-t border-zinc-800 pt-4" @submit.prevent="updateReport(report)">
          <div class="grid gap-3 sm:grid-cols-2">
            <select v-model="reportEdit(report.id).status" class="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
              <option value="open">Ouvert</option><option value="reviewing">En revue</option><option value="resolved">Résolu</option><option value="dismissed">Classé</option>
            </select>
            <label class="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 text-sm"><input v-model="reportEdit(report.id).assignMe" type="checkbox"> M’assigner</label>
          </div>
          <textarea v-model="reportEdit(report.id).resolutionNote" rows="2" maxlength="2000" placeholder="Note de résolution obligatoire pour clôturer" class="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
          <button class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-black text-zinc-950 disabled:opacity-50" :disabled="saving === report.id">{{ saving === report.id ? "Enregistrement…" : "Enregistrer" }}</button>
        </form>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Signalements admin | Cookie Build", robots: "noindex, nofollow" });
interface Report { id: string; reporterPlayerId: string; reporterName: string | null; reportedPlayerId: string; reportedName: string | null; reason: string; createdAt: string; status: string; assignedTo: string | null; resolutionNote: string | null }
const user = useAdminUser();
const canWrite = useAdminAccess("reports:write");
const reports = ref<Report[]>([]); const loading = ref(true); const saving = ref(""); const status = ref("active"); const message = ref(""); const messageTone = ref<"error" | "success">("success");
const edits = reactive<Record<string, { status: string; assignMe: boolean; resolutionNote: string }>>({});
function reportEdit(id: string) { return edits[id] || (edits[id] = { status: "open", assignMe: false, resolutionNote: "" }); }
async function load() {
  loading.value = true; message.value = "";
  try {
    reports.value = (await adminRequest<{ data: Report[] }>(`/api/admin/reports?status=${status.value}`)).data;
    for (const report of reports.value) edits[report.id] = { status: report.status, assignMe: report.assignedTo === user.value?.uid, resolutionNote: report.resolutionNote || "" };
  } catch (error) { message.value = adminErrorMessage(error); messageTone.value = "error"; }
  finally { loading.value = false; }
}
async function updateReport(report: Report) {
  saving.value = report.id; message.value = "";
  try {
    const edit = reportEdit(report.id);
    await adminRequest(`/api/admin/reports/${report.id}`, { method: "PATCH", body: { status: edit.status, assignedTo: edit.assignMe ? "me" : null, resolutionNote: edit.resolutionNote } });
    message.value = "Signalement mis à jour et action ajoutée à l’audit."; messageTone.value = "success"; await load();
  } catch (error) { message.value = adminErrorMessage(error); messageTone.value = "error"; }
  finally { saving.value = ""; }
}
const labelStatus = (value: string) => ({ open: "Ouvert", reviewing: "En revue", resolved: "Résolu", dismissed: "Classé" }[value] || value);
const statusClass = (value: string) => value === "open" ? "text-red-300" : value === "reviewing" ? "text-amber-300" : "text-emerald-300";
const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
await load();
</script>
