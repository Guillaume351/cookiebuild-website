<template>
  <nav class="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-md">
    <div
      class="container mx-auto flex items-center justify-between px-4 py-3"
    >
      <div class="flex items-center">
        <NuxtLink to="/" class="flex items-center">
          <img
            src="/android-chrome-192x192.png"
            alt="Cookie Build Logo"
            class="h-10 w-10 mr-3"
          />
          <span class="text-xl font-bold text-white">Cookie Build</span>
        </NuxtLink>
      </div>
      <div class="hidden md:flex space-x-6">
        <NuxtLink to="/" class="text-white hover:text-gray-300 transition-colors">Home</NuxtLink>
        <NuxtLink to="/player-stats" class="text-white hover:text-gray-300 transition-colors"
          >Player Stats</NuxtLink
        >
        <NuxtLink to="/updates" class="text-white hover:text-gray-300 transition-colors">Updates</NuxtLink>
      </div>
      <button
        type="button"
        class="rounded-lg border border-white/15 p-2 text-white transition-colors hover:bg-white/10 md:hidden"
        :aria-expanded="mobileMenuOpen"
        aria-controls="mobile-navigation"
        aria-label="Toggle navigation"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <X v-if="mobileMenuOpen" class="h-5 w-5" />
        <Menu v-else class="h-5 w-5" />
      </button>
    </div>
    <div
      v-if="mobileMenuOpen"
      id="mobile-navigation"
      class="border-t border-white/10 bg-zinc-950/95 px-4 py-3 md:hidden"
    >
      <div class="container mx-auto flex flex-col gap-1">
        <NuxtLink
          to="/"
          class="rounded-lg px-3 py-3 text-white hover:bg-white/10"
          @click="mobileMenuOpen = false"
        >
          Home
        </NuxtLink>
        <NuxtLink
          to="/player-stats"
          class="rounded-lg px-3 py-3 text-white hover:bg-white/10"
          @click="mobileMenuOpen = false"
        >
          Player Stats
        </NuxtLink>
        <NuxtLink
          to="/updates"
          class="rounded-lg px-3 py-3 text-white hover:bg-white/10"
          @click="mobileMenuOpen = false"
        >
          Updates
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { Menu, X } from "@lucide/vue";

const mobileMenuOpen = ref(false);
</script>
