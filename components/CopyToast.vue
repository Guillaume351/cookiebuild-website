<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-6 z-[120] flex justify-center px-4" role="status" aria-live="polite" aria-atomic="true">
    <Transition
      enter-active-class="transition duration-200 motion-reduce:transition-none"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 motion-reduce:transition-none"
      leave-to-class="opacity-0"
    >
      <p v-if="message" class="pointer-events-auto rounded-xl border border-emerald-400/40 bg-zinc-950/95 px-4 py-3 text-sm font-bold text-emerald-100 shadow-2xl">
        {{ message }}
      </p>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const { message } = useCopyToast();
</script>
