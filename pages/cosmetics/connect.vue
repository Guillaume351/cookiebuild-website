<template>
  <div class="mx-auto max-w-2xl py-12">
    <LanguageFallbackNotice :available-locales="['fr']" />
    <NuxtLink to="/cosmetics" class="text-sm font-bold text-orange-300">← Catalogue</NuxtLink>
    <section class="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-6 md:p-10">
      <p class="text-sm font-black uppercase tracking-widest text-orange-300">Connexion sans email</p>
      <h1 class="mt-3 text-4xl font-black text-white">Lier ton joueur Minecraft</h1>
      <ol class="mt-6 space-y-3 text-zinc-300">
        <li>1. Connecte-toi à Cookie Build avec le joueur qui recevra l’accès.</li>
        <li>2. Lance <code class="rounded bg-black/40 px-2 py-1 text-orange-200">/support link</code>.</li>
        <li>3. Saisis ici le code de 8 caractères, valable 10 minutes.</li>
      </ol>
      <form class="mt-8" @submit.prevent="connect">
        <label for="commerce-code" class="block font-bold text-white">Code de liaison</label>
        <input id="commerce-code" v-model.trim="code" autocomplete="one-time-code" inputmode="text" maxlength="8" required pattern="[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjklmnpqrstuvwxyz23456789]{8}" class="mt-2 min-h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 font-mono text-xl uppercase tracking-[.3em] text-white focus:border-orange-400 focus:outline-none" />
        <p class="mt-2 text-sm text-zinc-500">Ce code lie ton joueur à cet espace web. Ne le partage avec personne.</p>
        <p v-if="error" role="alert" class="mt-4 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-red-200">{{ error }}</p>
        <button :disabled="loading" class="mt-6 min-h-12 w-full rounded-xl bg-orange-500 px-5 py-3 font-black text-zinc-950 hover:bg-orange-400 disabled:opacity-50">{{ loading ? "Connexion…" : "Lier ce joueur" }}</button>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const nuxtApp = useNuxtApp();
const player = useCommercePlayer();
const code = ref("");
const loading = ref(false);
const error = ref("");
async function connect() {
  if (loading.value) return;
  loading.value = true; error.value = "";
  try {
    const response = await commerceRequest<{ data: { player: { id: string; name: string | null } } }>("/api/commerce/session", {
      method: "POST", credentials: "include", body: { code: code.value.trim().toUpperCase() },
    });
    player.value = response.data.player;
    await nuxtApp.runWithContext(() => navigateTo(commerceReturnPath(route.query.next)));
  } catch (caught) { error.value = commerceErrorMessage(caught); }
  finally { loading.value = false; }
}
useSeoMeta({ title: "Lier Minecraft | Cookie Build", robots: "noindex, nofollow" });
</script>
