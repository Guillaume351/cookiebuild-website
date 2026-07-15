<template>
  <div>
    <AdminPageHeader title="Temps réel" description="Joueurs, parties, sanctions et commandes Paper actualisés toutes les trois secondes.">
      <div class="flex items-center gap-3">
        <span class="rounded-full border px-3 py-1 text-xs font-bold" :class="runtime?.bridge.connected ? 'border-emerald-800 text-emerald-300' : 'border-red-900 text-red-300'">
          {{ runtime?.bridge.connected ? "AdminBridge connecté" : "AdminBridge hors ligne" }}
        </span>
        <button class="rounded-xl border border-zinc-700 px-4 py-2 text-sm" @click="load()">Actualiser</button>
      </div>
    </AdminPageHeader>
    <AdminNotice v-if="notice" :tone="noticeTone" class="mb-6">{{ notice }}</AdminNotice>

    <section class="grid gap-4 md:grid-cols-3">
      <article class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><p class="text-sm text-zinc-400">Serveurs frais</p><p class="mt-2 text-4xl font-black">{{ liveSnapshots.length }}/{{ snapshots.length }}</p></article>
      <article class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><p class="text-sm text-zinc-400">Joueurs en ligne</p><p class="mt-2 text-4xl font-black">{{ players.length }}</p></article>
      <article class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><p class="text-sm text-zinc-400">Parties actives</p><p class="mt-2 text-4xl font-black">{{ games.length }}</p></article>
    </section>

    <section v-if="canOperate" class="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 class="font-black">Message réseau / appel de joueurs</h2>
      <form class="mt-4 grid gap-3 lg:grid-cols-[180px_1fr_180px_auto]" @submit.prevent="sendServerCommand">
        <select v-model="serverForm.type" aria-label="Type de commande" class="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
          <option value="message_all">Tous les joueurs</option><option value="message_lobby">Lobby</option><option value="rally">Appel de joueurs</option><option value="maintenance_on">Maintenance ON</option><option value="maintenance_off">Maintenance OFF</option><option value="drain">Drainer les parties</option><option value="restart_ready">Vérifier prêt au restart</option>
        </select>
        <input v-model="serverForm.value" maxlength="500" :placeholder="serverForm.type === 'rally' ? 'Mode de jeu' : 'Message ou motif'" class="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
        <select v-model="serverForm.serverId" aria-label="Serveur cible" class="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"><option v-for="snapshot in snapshots" :key="snapshot.serverId" :value="snapshot.serverId">{{ snapshot.serverId }}</option></select>
        <button class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-black text-zinc-950 disabled:opacity-50" :disabled="sending">Envoyer</button>
      </form>
    </section>

    <section class="mt-8">
      <h2 class="mb-3 text-xl font-black">Joueurs</h2>
      <div class="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900">
        <table class="w-full min-w-[900px] text-left text-sm">
          <thead class="border-b border-zinc-800 text-xs uppercase text-zinc-500"><tr><th class="p-4">Joueur</th><th class="p-4">État</th><th class="p-4">Partie</th><th class="p-4">Ping</th><th class="p-4">Action</th></tr></thead>
          <tbody><tr v-for="player in players" :key="player.id" class="border-b border-zinc-800/70 last:border-0"><td class="p-4"><strong>{{ player.name }}</strong><p class="font-mono text-xs text-zinc-600">{{ player.id }}</p></td><td class="p-4">{{ player.state }}</td><td class="p-4">{{ player.game_id || "—" }}</td><td class="p-4">{{ player.ping }} ms</td><td class="p-4"><div v-if="canModerate" class="flex flex-wrap gap-2"><button v-for="action in playerActions" :key="action.type" class="rounded-lg border border-zinc-700 px-2 py-1 text-xs hover:border-orange-500" @click="preparePlayer(player, action.type)">{{ action.label }}</button></div><span v-else class="text-zinc-600">Lecture seule</span></td></tr></tbody>
        </table>
        <p v-if="!players.length" class="p-8 text-zinc-500">Aucun joueur dans les snapshots récents.</p>
      </div>
    </section>

    <section class="mt-8">
      <h2 class="mb-3 text-xl font-black">Parties</h2>
      <div class="grid gap-4 xl:grid-cols-2">
        <article v-for="game in games" :key="game.id" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div class="flex justify-between gap-4"><div><h3 class="font-black">{{ game.name }}</h3><p class="font-mono text-xs text-zinc-600">{{ game.id }}</p></div><span class="text-sm text-orange-300">{{ game.state }}</span></div>
          <p class="mt-3 text-sm text-zinc-400">{{ game.players }}/{{ game.capacity }} joueurs · admissions {{ game.admissions_open ? "ouvertes" : "fermées" }}</p>
          <div v-if="canModerate" class="mt-4 flex flex-wrap gap-2"><button class="rounded-lg border border-zinc-700 px-3 py-1 text-xs" @click="sendGame(game, game.admissions_open ? 'close_admissions' : 'reopen_admissions')">{{ game.admissions_open ? "Fermer" : "Rouvrir" }} les admissions</button><button class="rounded-lg border border-red-900 px-3 py-1 text-xs text-red-300" @click="sendGame(game, 'safe_cancel')">Annuler proprement</button></div>
        </article>
      </div>
    </section>

    <section class="mt-8 grid gap-6 xl:grid-cols-2">
      <div><h2 class="mb-3 text-xl font-black">Commandes récentes</h2><div class="space-y-2"><article v-for="command in runtime?.commands.slice(0, 25)" :key="command.id" class="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm"><div class="flex justify-between"><strong>{{ command.type }}</strong><span :class="command.status === 'failed' ? 'text-red-300' : command.status === 'succeeded' ? 'text-emerald-300' : 'text-amber-300'">{{ command.status }}</span></div><p class="mt-1 font-mono text-xs text-zinc-600">{{ command.id }}</p><p v-if="command.error" class="mt-2 text-red-300">{{ command.error }}</p></article></div></div>
      <div><h2 class="mb-3 text-xl font-black">Sanctions actives</h2><div class="space-y-2"><article v-for="sanction in runtime?.sanctions" :key="sanction.id" class="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm"><div class="flex justify-between"><strong>{{ sanction.playerName }}</strong><span class="uppercase text-red-300">{{ sanction.actionType }}</span></div><p class="mt-2 text-zinc-400">{{ sanction.reason }}</p><div class="mt-2 flex items-center justify-between gap-3"><p class="text-xs text-zinc-600">Expire : {{ sanction.expiresAt ? formatDate(sanction.expiresAt) : "jamais" }}</p><button v-if="canModerate" class="rounded-lg border border-zinc-700 px-3 py-1 text-xs" @click="revokeSanction(sanction)">Lever</button></div></article><p v-if="!runtime?.sanctions.length" class="text-sm text-zinc-500">Aucune sanction active.</p></div></div>
    </section>

    <div v-if="playerForm" class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="player-command-title" @click.self="playerForm = null">
      <form class="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-950 p-6" @submit.prevent="sendPlayerCommand">
        <h2 id="player-command-title" class="text-xl font-black">{{ playerForm.type }} · {{ playerForm.player.name }}</h2>
        <label class="mt-5 block text-sm text-zinc-400">Motif ou message<input v-model="playerForm.text" required maxlength="500" class="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"></label>
        <label v-if="['ban_temp','mute'].includes(playerForm.type)" class="mt-4 block text-sm text-zinc-400">Durée (secondes)<input v-model.number="playerForm.duration" type="number" min="60" max="31536000" class="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"></label>
        <div class="mt-6 flex justify-end gap-3"><button type="button" class="rounded-lg border border-zinc-700 px-4 py-2" @click="playerForm = null">Annuler</button><button class="rounded-lg bg-orange-500 px-4 py-2 font-black text-zinc-950">Confirmer</button></div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Temps réel admin | Cookie Build", robots: "noindex, nofollow" });
interface Player { id: string; name: string; state: string; game_id: string | null; ping: number; serverId: string }
interface Game { id: string; name: string; state: string; admissions_open: boolean; players: number; capacity: number; serverId: string }
interface Snapshot { serverId: string; observedAt: string; payload: { players?: Omit<Player, "serverId">[]; games?: Omit<Game, "serverId">[] } }
interface Sanction { id: string; playerId: string; playerName: string; actionType: string; reason: string; expiresAt: string | null }
interface Runtime { bridge: { configured: boolean; connected: boolean }; snapshots: Snapshot[]; commands: Array<{ id: string; type: string; status: string; error: string | null }>; sanctions: Sanction[] }
const runtime = ref<Runtime | null>(null); const notice = ref(""); const noticeTone = ref<"error" | "success">("success"); const sending = ref(false);
const canModerate = useAdminAccess("moderation:write"); const canOperate = useAdminAccess("runtime:write");
const snapshots = computed(() => runtime.value?.snapshots || []);
const liveSnapshots = computed(() => snapshots.value.filter((snapshot) => Date.now() - new Date(snapshot.observedAt).getTime() < 20_000));
const players = computed(() => liveSnapshots.value.flatMap((snapshot) => (snapshot.payload.players || []).map((player) => ({ ...player, serverId: snapshot.serverId }))));
const games = computed(() => liveSnapshots.value.flatMap((snapshot) => (snapshot.payload.games || []).map((game) => ({ ...game, serverId: snapshot.serverId }))));
const serverForm = reactive({ type: "message_all", value: "", serverId: "" });
const playerActions = [{ type: "message_player", label: "Message" }, { type: "kick", label: "Expulser" }, { type: "return_lobby", label: "Lobby" }, { type: "mute", label: "Mute" }, { type: "ban_temp", label: "Ban 24 h" }, { type: "ban_permanent", label: "Ban permanent" }];
const playerForm = ref<{ player: Player; type: string; text: string; duration: number } | null>(null);
async function load(silent = false) { try { runtime.value = (await adminRequest<{ data: Runtime }>("/api/admin/runtime")).data; if (!serverForm.serverId) serverForm.serverId = snapshots.value[0]?.serverId || "minecraft-1"; } catch (error) { if (!silent) { notice.value = adminErrorMessage(error); noticeTone.value = "error"; } } }
async function command(body: Record<string, unknown>) { sending.value = true; notice.value = ""; try { await adminRequest("/api/admin/runtime/commands", { method: "POST", body }); notice.value = "Commande envoyée et ajoutée à l’audit."; noticeTone.value = "success"; await load(true); } catch (error) { notice.value = adminErrorMessage(error); noticeTone.value = "error"; } finally { sending.value = false; } }
async function sendServerCommand() { const type = serverForm.type === "maintenance_on" || serverForm.type === "maintenance_off" ? "maintenance" : serverForm.type; const payload = serverForm.type === "rally" ? { gamemode: serverForm.value } : serverForm.type === "maintenance_on" || serverForm.type === "maintenance_off" ? { enabled: serverForm.type === "maintenance_on", message: serverForm.value || undefined } : ["drain", "message_all", "message_lobby"].includes(serverForm.type) ? { message: serverForm.value || undefined } : {}; await command({ type, serverId: serverForm.serverId, payload }); serverForm.value = ""; }
function preparePlayer(player: Player, type: string) { playerForm.value = { player, type, text: type === "return_lobby" ? "Retour au lobby demandé par un administrateur" : "", duration: type === "ban_temp" ? 86400 : 3600 }; }
async function sendPlayerCommand() { const form = playerForm.value; if (!form) return; const payload = form.type === "message_player" ? { message: form.text } : { reason: form.text, player_name: form.player.name, ...(["ban_temp", "mute"].includes(form.type) ? { duration_seconds: form.duration } : {}) }; await command({ type: form.type, serverId: form.player.serverId, targetId: form.player.id, payload }); playerForm.value = null; }
async function sendGame(game: Game, type: string) { const reason = type === "safe_cancel" ? window.prompt("Motif de l’annulation (obligatoire)") : null; if (type === "safe_cancel" && !reason) return; await command({ type, serverId: game.serverId, targetId: game.id, payload: reason ? { reason } : {} }); }
async function revokeSanction(sanction: Sanction) { const serverId = liveSnapshots.value[0]?.serverId || snapshots.value[0]?.serverId; if (!serverId) { notice.value = "Aucun serveur cible disponible."; noticeTone.value = "error"; return; } await command({ type: sanction.actionType === "ban" ? "unban" : "unmute", serverId, targetId: sanction.playerId, payload: {} }); }
const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
let timer: ReturnType<typeof setInterval> | null = null;
onMounted(() => { timer = setInterval(() => void load(true), 3_000); }); onUnmounted(() => { if (timer) clearInterval(timer); });
await load();
</script>
