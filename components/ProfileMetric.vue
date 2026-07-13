<template>
  <div class="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
    <p class="text-[10px] font-black uppercase tracking-widest text-zinc-500">{{ label }}</p>
    <p class="mt-1 text-xl font-black text-white">{{ value }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string | number }>();
</script>
