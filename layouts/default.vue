<template>
  <div class="flex flex-col min-h-screen">
    <AppHeader />
    <main class="flex-grow container mx-auto px-4 py-8 mt-[76px]">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<script setup>
import AppHeader from "~/components/AppHeader.vue";
import AppFooter from "~/components/AppFooter.vue";
</script>
