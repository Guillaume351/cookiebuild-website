<template>
  <div>
    <AdminPageHeader title="Notifications mobiles" description="Prévisualisez l’audience FCM, programmez une campagne et suivez sa livraison." />
    <AdminNotice v-if="message" :tone="messageTone" class="mb-6">{{ message }}</AdminNotice>
    <div class="grid gap-6 xl:grid-cols-[minmax(380px,0.8fr)_minmax(0,1.2fr)]">
      <form v-if="canWrite" class="h-fit space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 xl:sticky xl:top-24" @submit.prevent="send">
        <h2 class="text-lg font-black">Nouvelle campagne</h2>
        <div class="grid gap-3 sm:grid-cols-2"><label class="admin-label">Catégorie<select v-model="form.kind" class="admin-input" @change="preview"><option value="announcement">Annonce</option><option value="event">Événement</option><option value="server_status">État du serveur</option><option value="social">Social</option></select></label><label class="admin-label">Audience<select v-model="form.scope" class="admin-input" @change="preview"><option value="all">Tous les appareils</option><option value="ios">iOS</option><option value="android">Android</option></select></label></div>
        <div class="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4"><p class="text-sm text-zinc-400">Audience éligible estimée</p><p class="mt-1 text-3xl font-black text-orange-300">{{ previewing ? '…' : recipientEstimate }}</p><p class="mt-1 text-xs text-zinc-500">Autorisation active et préférence compatible incluses.</p></div>
        <label class="admin-label">Titre<input v-model="form.title" required maxlength="120" class="admin-input"></label>
        <label class="admin-label">Message<textarea v-model="form.body" maxlength="500" rows="4" class="admin-input" /></label>
        <label class="admin-label">Lien profond ou cookie-build.com<input v-model="form.deepLink" maxlength="2048" placeholder="cookiebuild://news" class="admin-input"></label>
        <label class="admin-label">Image HTTPS<input v-model="form.imageUrl" type="url" maxlength="2048" class="admin-input"></label>
        <label class="admin-label">Programmation (vide = maintenant)<input v-model="form.scheduledAt" type="datetime-local" class="admin-input"></label>
        <label v-if="form.kind === 'server_status'" class="flex items-center gap-2 text-sm text-zinc-300"><input v-model="form.urgent" type="checkbox"> Livraison urgente pour incident serveur</label>
        <div class="rounded-xl border border-zinc-700 bg-zinc-950 p-4"><p class="text-xs font-bold uppercase tracking-wider text-zinc-500">Aperçu</p><p class="mt-2 font-black text-white">{{ form.title || 'Titre de la notification' }}</p><p class="mt-1 text-sm text-zinc-400">{{ form.body || 'Le message apparaîtra ici.' }}</p></div>
        <button :disabled="sending || recipientEstimate === 0" class="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-zinc-950 disabled:opacity-50">{{ sending ? 'Mise en file…' : form.scheduledAt ? 'Programmer la campagne' : 'Envoyer maintenant' }}</button>
      </form>

      <section>
        <div class="mb-4 flex items-center justify-between"><h2 class="text-lg font-black">Historique</h2><button class="rounded-lg px-3 py-2 text-sm font-bold text-orange-400 hover:bg-zinc-900" @click="load">Actualiser</button></div>
        <div v-if="loading" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-500">Chargement…</div>
        <div v-else class="space-y-3">
          <article v-for="campaign in campaigns" :key="campaign.id" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div class="flex flex-wrap items-start justify-between gap-3"><div><p class="font-black text-white">{{ campaign.title }}</p><p class="mt-1 text-sm text-zinc-400">{{ campaign.body }}</p></div><span :class="deliveryClass(campaign)" class="rounded-full px-3 py-1 text-xs font-bold uppercase">{{ deliveryLabel(campaign) }}</span></div>
            <dl class="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4"><div><dt class="text-zinc-500">Audience</dt><dd class="mt-1 font-bold text-zinc-300">{{ campaign.recipientEstimate }}</dd></div><div><dt class="text-zinc-500">Tentatives</dt><dd class="mt-1 font-bold text-zinc-300">{{ campaign.attempts ?? 0 }}</dd></div><div><dt class="text-zinc-500">Programmé</dt><dd class="mt-1 text-zinc-300">{{ formatDate(campaign.scheduledAt) }}</dd></div><div><dt class="text-zinc-500">Auteur</dt><dd class="mt-1 truncate text-zinc-300">{{ campaign.createdByName || campaign.createdBy }}</dd></div></dl>
            <p v-if="campaign.lastError" class="mt-3 rounded-lg bg-red-950/40 p-3 text-xs text-red-200">{{ campaign.lastError }}</p>
            <button v-if="canWrite && campaign.status !== 'cancelled' && campaign.outboxStatus === 'pending'" class="mt-4 text-xs font-bold text-red-400 hover:text-red-300" @click="cancelCampaign(campaign.id)">Annuler avant envoi</button>
          </article>
          <p v-if="!campaigns.length" class="rounded-2xl border border-zinc-800 p-8 text-zinc-500">Aucune campagne émise.</p>
        </div>
      </section>
    </div>

    <section class="mt-10">
      <div class="mb-4"><h2 class="text-lg font-black">Toutes les émissions FCM</h2><p class="mt-1 text-sm text-zinc-500">Outbox complète, y compris appels de joueurs, social, rappels automatiques et suppressions de compte. Les destinataires et tokens ne sont jamais exposés.</p></div>
      <div class="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-left text-sm">
            <thead class="bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500"><tr><th class="px-5 py-4">Création</th><th class="px-5 py-4">Type</th><th class="px-5 py-4">Statut</th><th class="px-5 py-4">Tentatives</th><th class="px-5 py-4">Livraison</th><th class="px-5 py-4">Erreur</th></tr></thead>
            <tbody class="divide-y divide-zinc-800"><tr v-for="item in outbox" :key="item.id"><td class="whitespace-nowrap px-5 py-4 text-zinc-400">{{ formatDate(item.createdAt) }}</td><td class="px-5 py-4 font-mono text-xs text-zinc-300">{{ item.kind }}</td><td class="px-5 py-4"><span class="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold uppercase">{{ item.status }}</span></td><td class="px-5 py-4 text-zinc-300">{{ item.attempts }}</td><td class="whitespace-nowrap px-5 py-4 text-zinc-400">{{ item.deliveredAt ? formatDate(item.deliveredAt) : '—' }}</td><td class="max-w-md px-5 py-4 text-xs text-red-300">{{ item.lastError || '—' }}</td></tr></tbody>
          </table>
        </div>
        <p v-if="!loading && !outbox.length" class="p-8 text-zinc-500">Aucune émission enregistrée.</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Notifications admin | Cookie Build", robots: "noindex, nofollow" });
interface Campaign { id: string; title: string; body: string | null; recipientEstimate: number; status: string; outboxStatus: string | null; attempts: number | null; scheduledAt: string; deliveredAt: string | null; lastError: string | null; createdBy: string; createdByName: string | null }
interface OutboxItem { id: string; kind: string; status: string; attempts: number; availableAt: string; deliveredAt: string | null; lastError: string | null; createdAt: string }
const canWrite = useAdminAccess("notifications:write"); const loading = ref(true); const sending = ref(false); const previewing = ref(false); const recipientEstimate = ref(0); const campaigns = ref<Campaign[]>([]); const outbox = ref<OutboxItem[]>([]); const message = ref(""); const messageTone = ref<"success" | "error">("success");
const form = reactive({ kind: "announcement", scope: "all", title: "", body: "", deepLink: "", imageUrl: "", scheduledAt: "", urgent: false });
const audience = computed(() => form.scope === "all" ? { scope: "all" } : { scope: "platform", platform: form.scope });
async function preview() { previewing.value = true; try { recipientEstimate.value = (await adminRequest<{ data: { recipientEstimate: number } }>("/api/admin/notifications/audience-preview", { method: "POST", body: { kind: form.kind, audience: audience.value } })).data.recipientEstimate; } catch (error) { showError(error); } finally { previewing.value = false; } }
async function load() { loading.value = true; try { const [campaignResponse, outboxResponse] = await Promise.all([adminRequest<{ data: Campaign[] }>("/api/admin/notifications/campaigns"), adminRequest<{ data: OutboxItem[] }>("/api/admin/notifications/outbox")]); campaigns.value = campaignResponse.data; outbox.value = outboxResponse.data; } catch (error) { showError(error); } finally { loading.value = false; } }
async function send() { sending.value = true; try { await adminRequest("/api/admin/notifications/campaigns", { method: "POST", body: { kind: form.kind, audience: audience.value, title: form.title, body: form.body || null, deepLink: form.deepLink || null, imageUrl: form.imageUrl || null, scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null, urgent: form.urgent } }); Object.assign(form, { title: "", body: "", deepLink: "", imageUrl: "", scheduledAt: "", urgent: false }); showSuccess("Campagne mise en file dans l’outbox FCM."); await load(); } catch (error) { showError(error); } finally { sending.value = false; } }
async function cancelCampaign(id: string) { try { await adminRequest(`/api/admin/notifications/campaigns/${id}/cancel`, { method: "POST" }); showSuccess("Campagne annulée."); await load(); } catch (error) { showError(error); } }
function showError(error: unknown) { message.value = adminErrorMessage(error); messageTone.value = "error"; } function showSuccess(value: string) { message.value = value; messageTone.value = "success"; }
const deliveryLabel = (item: Campaign) => item.status === "cancelled" ? "annulée" : item.outboxStatus === "delivered" ? "livrée" : item.outboxStatus === "dead" ? "échec" : item.outboxStatus === "processing" ? "envoi" : item.status;
const deliveryClass = (item: Campaign) => item.outboxStatus === "delivered" ? "bg-emerald-500/10 text-emerald-300" : item.outboxStatus === "dead" || item.status === "cancelled" ? "bg-red-500/10 text-red-300" : "bg-orange-500/10 text-orange-300";
const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
await Promise.all([load(), preview()]);
</script>

<style scoped>
.admin-label { @apply block text-sm font-semibold text-zinc-300; }
.admin-input { @apply mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500; }
</style>
