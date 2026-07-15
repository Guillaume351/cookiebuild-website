<template>
  <main class="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.2),_transparent_38%),#09090b] p-4 text-zinc-100">
    <slot />
  </main>
</template>

<script setup lang="ts">
useHead({ htmlAttrs: { lang: "fr" } });
</script>
