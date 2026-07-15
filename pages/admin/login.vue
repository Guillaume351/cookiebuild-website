<template>
  <section class="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/90 p-7 shadow-2xl sm:p-10">
    <div class="mb-8 flex items-center gap-4">
      <span class="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500 font-black text-zinc-950">CB</span>
      <div>
        <h1 class="text-2xl font-black">Espace administrateur</h1>
        <p class="text-sm text-zinc-400">Accès réservé à l’équipe Cookie Build</p>
      </div>
    </div>
    <AdminNotice v-if="errorMessage" tone="error" class="mb-5">{{ errorMessage }}</AdminNotice>
    <form class="space-y-5" @submit.prevent="login">
      <label class="block text-sm font-semibold text-zinc-300">
        Adresse email
        <input v-model.trim="email" type="email" autocomplete="username" required maxlength="320" class="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20">
      </label>
      <label class="block text-sm font-semibold text-zinc-300">
        Mot de passe
        <input v-model="password" type="password" autocomplete="current-password" required maxlength="1024" class="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20">
      </label>
      <button :disabled="loading" class="w-full rounded-xl bg-orange-500 px-5 py-3 font-black text-zinc-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50">
        {{ loading ? "Connexion…" : "Se connecter" }}
      </button>
    </form>
    <p class="mt-6 text-xs leading-relaxed text-zinc-500">Le compte doit posséder le claim Firebase <code>admin</code> et être activé dans le RBAC. La session est révocable et expire automatiquement.</p>
  </section>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin-login" });
useSeoMeta({ title: "Administration | Cookie Build", robots: "noindex, nofollow" });

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref("");
const route = useRoute();
const user = useAdminUser();

async function login() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await adminRequest<{ data: { user: AdminUser } }>("/api/admin/auth/login", {
      method: "POST",
      body: { email: email.value, password: password.value },
    });
    user.value = response.data.user;
    const requested = typeof route.query.next === "string" ? route.query.next : "/admin";
    await navigateTo(requested.startsWith("/admin") && requested !== "/admin/login" ? requested : "/admin");
  } catch (error) {
    errorMessage.value = adminErrorMessage(error);
  } finally {
    password.value = "";
    loading.value = false;
  }
}
</script>
