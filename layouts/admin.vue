<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100">
    <header class="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur" @keydown.esc="mobileNavigationOpen = false">
      <div class="mx-auto flex max-w-[1600px] items-center gap-2 px-4 py-3 sm:gap-4 lg:px-6">
        <NuxtLink to="/admin" class="flex shrink-0 items-center gap-3 font-black tracking-tight">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 text-zinc-950">CB</span>
          <span class="hidden sm:block">Control Center</span>
        </NuxtLink>
        <nav class="ml-auto hidden min-w-0 items-center gap-1 overflow-x-auto text-sm xl:flex" aria-label="Administration">
          <NuxtLink v-for="item in visibleNavigation" :key="item.to" :to="item.to" class="whitespace-nowrap rounded-lg px-3 py-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white" active-class="!bg-orange-500/15 !text-orange-300">
            {{ item.label }}
          </NuxtLink>
        </nav>
        <div class="hidden border-l border-zinc-800 pl-4 2xl:block">
          <p class="max-w-40 truncate text-sm font-semibold">{{ user?.displayName || user?.email }}</p>
          <p class="text-xs uppercase tracking-wider text-zinc-500">{{ user?.role }}</p>
        </div>
        <button
          type="button"
          class="ml-auto rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-orange-500 hover:text-white xl:hidden"
          aria-controls="admin-mobile-navigation"
          :aria-expanded="mobileNavigationOpen"
          @click="mobileNavigationOpen = !mobileNavigationOpen"
        >
          {{ mobileNavigationOpen ? "Fermer" : "Menu" }}
        </button>
        <button type="button" class="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-orange-500 hover:text-white" @click="logout">Quitter</button>
      </div>
      <div v-if="mobileNavigationOpen" id="admin-mobile-navigation" class="border-t border-zinc-800 px-4 py-3 xl:hidden">
        <div class="mx-auto max-w-[1600px]">
          <div class="mb-3 min-w-0">
            <p class="truncate text-sm font-semibold">{{ user?.displayName || user?.email }}</p>
            <p class="text-xs uppercase tracking-wider text-zinc-500">{{ user?.role }}</p>
          </div>
          <nav class="grid max-h-[calc(100vh-8rem)] grid-cols-2 gap-1 overflow-y-auto text-sm" aria-label="Administration mobile">
            <NuxtLink v-for="item in visibleNavigation" :key="item.to" :to="item.to" class="rounded-lg px-3 py-2.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white" active-class="!bg-orange-500/15 !text-orange-300">
              {{ item.label }}
            </NuxtLink>
          </nav>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-[1600px] p-4 lg:p-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({ htmlAttrs: { lang: "fr" } });
const user = useAdminUser();
const route = useRoute();
const mobileNavigationOpen = ref(false);
const navigation = [
  { to: "/admin", label: "Vue d’ensemble", permission: "dashboard:read" },
  { to: "/admin/runtime", label: "Temps réel", permission: "runtime:read" },
  { to: "/admin/observability", label: "Observabilité", permission: "dashboard:read" },
  { to: "/admin/skyblock-economy", label: "Économie Skyblock", permission: "dashboard:read" },
  { to: "/admin/reports", label: "Signalements", permission: "reports:read" },
  { to: "/admin/content", label: "Contenus", permission: "content:read" },
  { to: "/admin/notifications", label: "Notifications", permission: "notifications:read" },
  { to: "/admin/audit", label: "Audit", permission: "audit:read" },
  { to: "/admin/operations", label: "Opérations", permission: "operations:read" },
  { to: "/admin/commerce", label: "Commerce", permission: "commerce:read" },
  { to: "/admin/updates", label: "Mises à jour", permission: "updates:read" },
];
const visibleNavigation = computed(() => navigation.filter((item) => user.value?.permissions.includes(item.permission)));
watch(() => route.path, () => { mobileNavigationOpen.value = false; });

async function logout() {
  try { await adminRequest("/api/admin/auth/logout", { method: "POST" }); } finally {
    user.value = null;
    await navigateTo("/admin/login");
  }
}
</script>
