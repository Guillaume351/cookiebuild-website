<template>
  <header class="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p class="text-sm font-bold uppercase tracking-[0.2em] text-orange-400">Cookie Build</p>
      <h1 class="mt-1 text-3xl font-black tracking-tight text-white md:text-4xl">{{ title }}</h1>
      <p v-if="description" class="mt-2 max-w-3xl text-zinc-400">{{ description }}</p>
    </div>
    <slot />
  </header>
</template>

<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>
