<template>
  <main class="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center py-16 text-center">
    <p class="text-sm font-black uppercase tracking-[0.3em] text-orange-400">404</p>
    <h1 class="mt-4 text-4xl font-black text-white md:text-5xl">This page could not be found</h1>
    <p class="mt-5 max-w-xl text-lg text-zinc-400">
      The address may be old or incomplete. The Minecraft network and account data are not affected.
    </p>
    <div class="mt-8 flex flex-wrap justify-center gap-3">
      <NuxtLink class="rounded-lg bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700" to="/">Return home</NuxtLink>
      <NuxtLink class="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-3 font-bold text-white hover:bg-zinc-800" to="/status">Check server status</NuxtLink>
      <NuxtLink class="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-3 font-bold text-white hover:bg-zinc-800" to="/support">Open support</NuxtLink>
    </div>
  </main>
</template>

<script setup lang="ts">
const event = useRequestEvent();
if (event) setResponseStatus(event, 404);

useSeoMeta({
  title: "Page Not Found | Cookie Build",
  description: "The requested Cookie Build page could not be found.",
  robots: "noindex, nofollow",
});
</script>
