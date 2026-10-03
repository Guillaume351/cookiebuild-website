<template>
  <div>
    <AdminPageHeader title="Galerie Build Battle" description="Constructions signalées ou masquées. 3 signalements masquent automatiquement une construction.">
      <select v-model="status" aria-label="Filtrer les constructions" class="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm" @change="load">
        <option value="reported">Signalées (publiées)</option><option value="hidden">Masquées</option><option value="all">Toutes</option>
      </select>
    </AdminPageHeader>
    <AdminNotice v-if="message" :tone="messageTone" class="mb-5">{{ message }}</AdminNotice>
    <div v-if="loading" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">Chargement…</div>
    <div v-else-if="!builds.length" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">Aucune construction dans cette file.</div>
    <div v-else class="grid gap-4 xl:grid-cols-2">
      <article v-for="build in builds" :key="build.id" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-black text-white">{{ build.themeName }} · {{ build.playerName || build.playerId }}</p>
            <p class="text-xs text-zinc-500">{{ build.shortCode }} · {{ formatDate(build.createdAt) }} · {{ build.likeCount }} j’aime</p>
          </div>
          <span class="rounded-full border border-zinc-700 px-3 py-1 text-xs font-bold uppercase" :class="build.status === 'hidden' ? 'text-red-300' : 'text-emerald-300'">{{ labelStatus(build.status) }}</span>
        </div>
        <p class="mt-4 rounded-xl bg-zinc-950 p-3 text-sm text-zinc-300">
          {{ build.reportCount }} signalement(s)<template v-if="build.reasons"> : {{ formatReasons(build.reasons) }}</template>
        </p>
        <a v-if="build.status === 'published'" :href="build.url" target="_blank" rel="noopener" class="mt-3 inline-block text-sm text-orange-300 underline">Voir la construction</a>
        <form v-if="canWrite && (build.status === 'published' || build.status === 'hidden')" class="mt-5 flex flex-wrap gap-3 border-t border-zinc-800 pt-4" @submit.prevent="moderate(build)">
          <input v-model="notes[build.id]" maxlength="500" placeholder="Note (facultative)" class="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
          <button class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-black text-zinc-950 disabled:opacity-50" :disabled="saving === build.id">
            {{ saving === build.id ? "Enregistrement…" : build.status === "hidden" ? "Rétablir" : "Masquer" }}
          </button>
        </form>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Galerie Build Battle admin | Cookie Build", robots: "noindex, nofollow" });
interface AdminBuild { id: string; shortCode: string; playerId: string; playerName: string | null; themeName: string; status: string; likeCount: number; reportCount: number; createdAt: string; reasons: Record<string, number> | null; url: string }
const canWrite = useAdminAccess("moderation:write");
const builds = ref<AdminBuild[]>([]); const loading = ref(true); const saving = ref(""); const status = ref("reported"); const message = ref(""); const messageTone = ref<"error" | "success">("success");
const notes = reactive<Record<string, string>>({});
async function load() {
  loading.value = true; message.value = "";
  try { builds.value = (await adminRequest<{ data: AdminBuild[] }>(`/api/admin/builds?status=${status.value}`)).data; }
  catch (error) { message.value = adminErrorMessage(error); messageTone.value = "error"; }
  finally { loading.value = false; }
}
async function moderate(build: AdminBuild) {
  saving.value = build.id; message.value = "";
  try {
    await adminRequest(`/api/admin/builds/${build.id}`, { method: "PATCH", body: { action: build.status === "hidden" ? "restore" : "hide", note: notes[build.id] || null } });
    message.value = "Construction mise à jour et action ajoutée à l’audit."; messageTone.value = "success"; await load();
  } catch (error) { message.value = adminErrorMessage(error); messageTone.value = "error"; }
  finally { saving.value = ""; }
}
const labelStatus = (value: string) => ({ published: "Publiée", hidden: "Masquée", private: "Privée" }[value] || value);
const reasonLabels: Record<string, string> = { offensive: "offensant", inappropriate: "inapproprié", other: "autre" };
const formatReasons = (reasons: Record<string, number>) => Object.entries(reasons).map(([reason, count]) => `${reasonLabels[reason] || reason} ×${count}`).join(", ");
const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
await load();
</script>
