<template>
  <div>
    <AdminPageHeader title="Contenus" description="Actualités, changelog et événements publiés sur le site et dans l’application." />
    <AdminNotice v-if="message" :tone="messageTone" class="mb-6">{{ message }}</AdminNotice>
    <div class="mb-6 flex gap-2 border-b border-zinc-800">
      <button v-for="item in ['posts', 'events']" :key="item" class="border-b-2 px-4 py-3 text-sm font-bold" :class="tab === item ? 'border-orange-500 text-orange-300' : 'border-transparent text-zinc-500'" @click="tab = item as typeof tab">{{ item === 'posts' ? 'Actualités & changelog' : 'Événements' }}</button>
    </div>

    <section v-if="tab === 'posts'" class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
      <div class="space-y-3">
        <article v-for="post in content.posts" :key="post.id" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div><p class="font-black text-white">{{ post.title }}</p><p class="mt-1 text-sm text-zinc-400">{{ post.summary }}</p></div>
            <div class="flex items-center gap-2"><span class="rounded-full bg-zinc-800 px-3 py-1 text-xs uppercase text-zinc-300">{{ post.contentType }}</span><span class="rounded-full bg-orange-500/10 px-3 py-1 text-xs uppercase text-orange-300">{{ post.status }}</span></div>
          </div>
          <div class="mt-4 flex items-center justify-between text-xs text-zinc-500"><span>/{{ post.slug }}</span><button v-if="canWrite" class="font-bold text-orange-400 hover:text-orange-300" @click="editPost(post)">Modifier</button></div>
        </article>
        <p v-if="!loading && !content.posts.length" class="rounded-2xl border border-zinc-800 p-8 text-zinc-500">Aucun contenu.</p>
      </div>
      <form v-if="canWrite" class="h-fit space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 xl:sticky xl:top-24" @submit.prevent="savePost">
        <div class="flex items-center justify-between"><h2 class="text-lg font-black">{{ postForm.id ? 'Modifier le contenu' : 'Nouveau contenu' }}</h2><button v-if="postForm.id" type="button" class="text-xs text-zinc-400" @click="resetPost">Annuler</button></div>
        <div class="grid gap-3 sm:grid-cols-2"><label class="admin-label">Type<select v-model="postForm.contentType" class="admin-input"><option value="news">Actualité</option><option value="changelog">Changelog</option></select></label><label class="admin-label">Statut<select v-model="postForm.status" class="admin-input"><option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option></select></label></div>
        <label class="admin-label">Titre<input v-model="postForm.title" required maxlength="160" class="admin-input"></label>
        <label class="admin-label">Slug<input v-model="postForm.slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxlength="120" class="admin-input"></label>
        <label class="admin-label">Résumé<textarea v-model="postForm.summary" required maxlength="500" rows="2" class="admin-input" /></label>
        <label class="admin-label">Contenu<textarea v-model="postForm.body" required maxlength="20000" rows="7" class="admin-input" /></label>
        <label class="admin-label">Image HTTPS<input v-model="postForm.coverImageUrl" type="url" class="admin-input"></label>
        <div class="grid gap-3 sm:grid-cols-2"><label class="admin-label">Publication<input v-model="postForm.publishedAt" type="datetime-local" class="admin-input"></label><label class="admin-label">Expiration<input v-model="postForm.expiresAt" type="datetime-local" class="admin-input"></label></div>
        <button :disabled="saving" class="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-zinc-950 disabled:opacity-50">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</button>
      </form>
    </section>

    <section v-else class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
      <div class="space-y-3">
        <article v-for="item in content.events" :key="item.id" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div class="flex items-start justify-between gap-3"><div><p class="font-black text-white">{{ item.title }}</p><p class="mt-1 text-sm text-zinc-400">{{ item.description }}</p></div><span class="rounded-full bg-orange-500/10 px-3 py-1 text-xs uppercase text-orange-300">{{ item.status }}</span></div>
          <p class="mt-3 text-xs text-zinc-500">{{ formatDate(item.startsAt) }}<span v-if="item.gameType"> · {{ item.gameType }}</span></p>
          <button v-if="canWrite" class="mt-3 text-xs font-bold text-orange-400" @click="editEvent(item)">Modifier</button>
        </article>
      </div>
      <form v-if="canWrite" class="h-fit space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 xl:sticky xl:top-24" @submit.prevent="saveEvent">
        <div class="flex items-center justify-between"><h2 class="text-lg font-black">{{ eventForm.id ? 'Modifier l’événement' : 'Nouvel événement' }}</h2><button v-if="eventForm.id" type="button" class="text-xs text-zinc-400" @click="resetEvent">Annuler</button></div>
        <label class="admin-label">Statut<select v-model="eventForm.status" class="admin-input"><option value="draft">Brouillon</option><option value="scheduled">Programmé</option><option value="cancelled">Annulé</option><option value="completed">Terminé</option></select></label>
        <label class="admin-label">Titre<input v-model="eventForm.title" required maxlength="160" class="admin-input"></label>
        <label class="admin-label">Slug<input v-model="eventForm.slug" required maxlength="120" class="admin-input"></label>
        <label class="admin-label">Description<textarea v-model="eventForm.description" required maxlength="20000" rows="6" class="admin-input" /></label>
        <div class="grid gap-3 sm:grid-cols-2"><label class="admin-label">Mode de jeu<input v-model="eventForm.gameType" maxlength="64" class="admin-input"></label><label class="admin-label">Image HTTPS<input v-model="eventForm.imageUrl" type="url" class="admin-input"></label></div>
        <div class="grid gap-3 sm:grid-cols-2"><label class="admin-label">Début<input v-model="eventForm.startsAt" required type="datetime-local" class="admin-input"></label><label class="admin-label">Fin<input v-model="eventForm.endsAt" type="datetime-local" class="admin-input"></label></div>
        <button :disabled="saving" class="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-zinc-950 disabled:opacity-50">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</button>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Contenus admin | Cookie Build", robots: "noindex, nofollow" });
interface Post { id: string; slug: string; title: string; summary: string; body: string; contentType: string; coverImageUrl: string | null; status: string; publishedAt: string | null; expiresAt: string | null }
interface EventItem { id: string; slug: string; title: string; description: string; gameType: string | null; imageUrl: string | null; startsAt: string; endsAt: string | null; status: string }
const canWrite = useAdminAccess("content:write"); const tab = ref<"posts" | "events">("posts"); const loading = ref(true); const saving = ref(false); const message = ref(""); const messageTone = ref<"success" | "error">("success"); const content = reactive<{ posts: Post[]; events: EventItem[] }>({ posts: [], events: [] });
const blankPost = () => ({ id: "", slug: "", title: "", summary: "", body: "", contentType: "news", coverImageUrl: "", status: "draft", publishedAt: "", expiresAt: "" });
const blankEvent = () => ({ id: "", slug: "", title: "", description: "", gameType: "", imageUrl: "", startsAt: "", endsAt: "", status: "draft" });
const postForm = reactive(blankPost()); const eventForm = reactive(blankEvent());
const toLocal = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";
const toIso = (value: string) => value ? new Date(value).toISOString() : null;
async function load() { loading.value = true; try { const response = await adminRequest<{ data: { posts: Post[]; events: EventItem[] } }>("/api/admin/content"); content.posts = response.data.posts; content.events = response.data.events; } catch (error) { showError(error); } finally { loading.value = false; } }
function editPost(post: Post) { Object.assign(postForm, post, { coverImageUrl: post.coverImageUrl || "", publishedAt: toLocal(post.publishedAt), expiresAt: toLocal(post.expiresAt) }); }
function editEvent(item: EventItem) { Object.assign(eventForm, item, { gameType: item.gameType || "", imageUrl: item.imageUrl || "", startsAt: toLocal(item.startsAt), endsAt: toLocal(item.endsAt) }); }
function resetPost() { Object.assign(postForm, blankPost()); } function resetEvent() { Object.assign(eventForm, blankEvent()); }
async function savePost() { saving.value = true; try { const id = postForm.id; await adminRequest(id ? `/api/admin/content/news/${id}` : "/api/admin/content/news", { method: id ? "PATCH" : "POST", body: { ...postForm, id: undefined, publishedAt: toIso(postForm.publishedAt), expiresAt: toIso(postForm.expiresAt), coverImageUrl: postForm.coverImageUrl || null } }); resetPost(); showSuccess("Contenu enregistré."); await load(); } catch (error) { showError(error); } finally { saving.value = false; } }
async function saveEvent() { saving.value = true; try { const id = eventForm.id; await adminRequest(id ? `/api/admin/content/events/${id}` : "/api/admin/content/events", { method: id ? "PATCH" : "POST", body: { ...eventForm, id: undefined, startsAt: toIso(eventForm.startsAt), endsAt: toIso(eventForm.endsAt), imageUrl: eventForm.imageUrl || null, gameType: eventForm.gameType || null } }); resetEvent(); showSuccess("Événement enregistré."); await load(); } catch (error) { showError(error); } finally { saving.value = false; } }
function showError(error: unknown) { message.value = adminErrorMessage(error); messageTone.value = "error"; } function showSuccess(value: string) { message.value = value; messageTone.value = "success"; }
const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
await load();
</script>

<style scoped>
.admin-label { @apply block text-sm font-semibold text-zinc-300; }
.admin-input { @apply mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500; }
</style>
