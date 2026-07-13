<template>
  <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
    <p class="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">{{ label }}</p>
    <div class="flex items-center justify-between gap-3">
      <code class="overflow-x-auto text-sm font-bold text-white">{{ address }}</code>
      <button
        type="button"
        class="shrink-0 rounded-lg bg-zinc-800 p-2 text-zinc-300 hover:bg-zinc-700 hover:text-white"
        :aria-label="`Copy ${label}`"
        @click="$emit('copy')"
      >
        <Copy class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Copy } from "@lucide/vue";

defineProps<{ address: string; label: string }>();
defineEmits<{ copy: [] }>();
</script>
