<template>
  <div>
    <AdminPageHeader title="Opérations" description="Maintenance et redémarrage Minecraft via des runbooks privés, verrouillés et audités.">
      <div class="flex gap-3"><select v-model="serverId" aria-label="Serveur cible" class="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"><option v-for="server in runtimeServers" :key="server" :value="server">{{ server }}</option></select><button class="rounded-xl border border-zinc-700 px-4 py-2 text-sm" @click="load">Actualiser</button></div>
    </AdminPageHeader>
    <AdminNotice v-if="notice" :tone="noticeTone" class="mb-6">{{ notice }}</AdminNotice>
    <section class="grid gap-4 md:grid-cols-3">
      <article class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><p class="text-sm text-zinc-400">Service</p><p class="mt-2 text-2xl font-black" :class="status?.service?.ok === false ? 'text-red-300' : 'text-emerald-300'">{{ status?.service?.ok === false ? "Dégradé" : status ? "Joignable" : "Inconnu" }}</p></article>
      <article class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><p class="text-sm text-zinc-400">Maintenance</p><p class="mt-2 text-2xl font-black">{{ status?.maintenance?.enabled ? "Active" : "Inactive" }}</p></article>
      <article class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><p class="text-sm text-zinc-400">Joueurs détectés</p><p class="mt-2 text-2xl font-black">{{ status?.playerGuard?.players ?? "—" }}</p></article>
    </section>
    <section v-if="canWrite" class="mt-8 grid gap-6 xl:grid-cols-2">
      <form class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6" @submit.prevent="maintenance">
        <h2 class="text-xl font-black">Mode maintenance</h2><p class="mt-2 text-sm text-zinc-400">Ferme les admissions et connexions via Paper, puis synchronise le verrou du runner.</p>
        <label class="mt-5 block text-sm">Motif<input v-model="maintenanceForm.reason" required minlength="8" maxlength="500" class="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"></label>
        <label class="mt-4 flex items-center gap-3"><input v-model="maintenanceForm.enabled" type="checkbox"> Activer la maintenance</label>
        <div class="mt-5 flex gap-3"><button type="button" class="rounded-lg border border-zinc-700 px-4 py-2 text-sm" @click="simulate('maintenance')">Simuler</button><button class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-black text-zinc-950">Appliquer</button></div>
      </form>
      <form class="rounded-2xl border border-red-950 bg-zinc-900 p-6" @submit.prevent="restart">
        <h2 class="text-xl font-black text-red-300">Redémarrer Minecraft</h2><p class="mt-2 text-sm text-zinc-400">Refus automatique si des joueurs sont présents ou si les canaries ne sont pas configurés.</p>
        <label class="mt-5 block text-sm">Motif<input v-model="restartForm.reason" required minlength="8" maxlength="500" class="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"></label>
        <label v-if="isOwner" class="mt-4 flex items-center gap-3 text-sm text-red-300"><input v-model="restartForm.emergencyOverride" type="checkbox"> Dérogation d’urgence avec joueurs (si autorisée côté opérateur)</label>
        <label class="mt-4 block text-sm">Confirmation<input v-model="restartForm.confirmation" placeholder="REDÉMARRER" class="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"></label>
        <div class="mt-5 flex gap-3"><button type="button" class="rounded-lg border border-zinc-700 px-4 py-2 text-sm" @click="simulate('restart-minecraft')">Simuler</button><button class="rounded-lg bg-red-500 px-4 py-2 text-sm font-black text-white disabled:opacity-40" :disabled="restartForm.confirmation !== 'REDÉMARRER'">Redémarrer</button></div>
      </form>
    </section>
    <AdminNotice v-else class="mt-8">Votre rôle permet de consulter l’état, pas de lancer un runbook.</AdminNotice>
    <section class="mt-8 grid gap-6 xl:grid-cols-2">
      <div>
        <h2 class="mb-3 text-xl font-black">Historique des opérations</h2>
        <div class="space-y-2">
          <article v-for="entry in history.actions" :key="entry.id" class="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm">
            <div class="flex items-center justify-between gap-3"><strong>{{ entry.action }}</strong><span :class="entry.status === 'failed' ? 'text-red-300' : entry.status === 'succeeded' ? 'text-emerald-300' : 'text-amber-300'">{{ entry.status }}</span></div>
            <p class="mt-2 text-zinc-400">{{ entry.reason }}</p><p class="mt-2 text-xs text-zinc-600">{{ formatDate(entry.requestedAt) }}</p><p v-if="entry.error" class="mt-2 text-red-300">{{ entry.error }}</p>
          </article>
          <p v-if="!history.actions.length" class="text-sm text-zinc-500">Aucune opération enregistrée.</p>
        </div>
      </div>
      <div>
        <h2 class="mb-3 text-xl font-black">Événements Paper récents</h2>
        <div class="space-y-2">
          <article v-for="entry in history.runtimeEvents" :key="entry.id" class="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm">
            <div class="flex items-center justify-between gap-3"><strong>{{ entry.kind }}</strong><span class="text-xs text-zinc-500">{{ entry.serverId }}</span></div>
            <p class="mt-2 text-xs text-zinc-600">{{ formatDate(entry.observedAt) }}</p><details class="mt-2"><summary class="cursor-pointer text-xs text-zinc-400">Détails</summary><pre class="mt-2 overflow-auto text-xs text-zinc-500">{{ JSON.stringify(entry.payload, null, 2) }}</pre></details>
          </article>
          <p v-if="!history.runtimeEvents.length" class="text-sm text-zinc-500">Aucun événement enregistré.</p>
        </div>
      </div>
    </section>
    <details class="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><summary class="cursor-pointer font-black">Réponse opérateur brute</summary><pre class="mt-4 overflow-auto text-xs text-zinc-400">{{ JSON.stringify(status, null, 2) }}</pre></details>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Opérations admin | Cookie Build", robots: "noindex, nofollow" });
interface OperationEntry { id: string; action: string; status: string; reason: string; requestedAt: string; error: string | null }
interface RuntimeEvent { id: string; serverId: string; kind: string; payload: Record<string, unknown>; observedAt: string }
const user = useAdminUser(); const canWrite = useAdminAccess("operations:write"); const isOwner = computed(() => user.value?.role === "owner"); const status = ref<any>(null); const history = reactive<{ actions: OperationEntry[]; runtimeEvents: RuntimeEvent[] }>({ actions: [], runtimeEvents: [] }); const notice = ref(""); const noticeTone = ref<"error" | "success">("success"); const serverId = ref("minecraft-1"); const runtimeServers = ref<string[]>(["minecraft-1"]);
const maintenanceForm = reactive({ enabled: true, reason: "" }); const restartForm = reactive({ reason: "", emergencyOverride: false, confirmation: "" });
async function load() { try { const [operator, runtime, recent] = await Promise.all([adminRequest<{ data: any }>("/api/admin/operations/status"), adminRequest<{ data: { snapshots: Array<{ serverId: string }> } }>("/api/admin/runtime"), adminRequest<{ data: { actions: OperationEntry[]; runtimeEvents: RuntimeEvent[] } }>("/api/admin/operations/history")]); status.value = operator.data; history.actions = recent.data.actions; history.runtimeEvents = recent.data.runtimeEvents; runtimeServers.value = [...new Set(runtime.data.snapshots.map((snapshot) => snapshot.serverId))]; if (!runtimeServers.value.length) runtimeServers.value = [serverId.value]; if (!runtimeServers.value.includes(serverId.value)) serverId.value = runtimeServers.value[0] || "minecraft-1"; } catch (error) { notice.value = adminErrorMessage(error); noticeTone.value = "error"; } }
async function action(body: Record<string, unknown>) { notice.value = ""; try { const response = await adminRequest<{ data: any }>("/api/admin/operations/actions", { method: "POST", body: { ...body, serverId: serverId.value } }); notice.value = `Runbook terminé (${response.data.id || "simulation"}).`; noticeTone.value = "success"; await load(); } catch (error) { notice.value = adminErrorMessage(error); noticeTone.value = "error"; } }
async function simulate(simulationAction: "maintenance" | "restart-minecraft") { await action({ action: "simulate", simulationAction, enabled: maintenanceForm.enabled, reason: simulationAction === "maintenance" ? maintenanceForm.reason : restartForm.reason, emergencyOverride: restartForm.emergencyOverride }); }
async function maintenance() { await action({ action: "maintenance", enabled: maintenanceForm.enabled, reason: maintenanceForm.reason }); }
async function restart() { if (restartForm.confirmation !== "REDÉMARRER") return; await action({ action: "restart_minecraft", reason: restartForm.reason, emergencyOverride: restartForm.emergencyOverride }); restartForm.confirmation = ""; }
const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
await load();
</script>
