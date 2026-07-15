<template>
  <div :role="tone === 'error' ? 'alert' : 'status'" :aria-live="tone === 'error' ? 'assertive' : 'polite'" :class="['break-words rounded-xl border px-4 py-3 text-sm', tone === 'error' ? 'border-red-900 bg-red-950/40 text-red-200' : tone === 'success' ? 'border-emerald-900 bg-emerald-950/40 text-emerald-200' : 'border-zinc-800 bg-zinc-900 text-zinc-300']">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ tone?: "info" | "error" | "success" }>(), { tone: "info" });
</script>
