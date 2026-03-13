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
      </div>
    </div>
  </nav>
</template>
