<template>
  <div>
    <nav class="navbar">
      <div
        class="container mx-auto flex items-center justify-between px-4 py-3"
      >
        <div class="flex items-center" href="/">
          <a href="/" class="flex items-center">
            <img
              src="/android-chrome-192x192.png"
              alt="Cookie Build Logo"
              class="h-10 w-10 mr-3"
            />
            <span class="text-xl font-bold text-white">Cookie Build</span>
          </a>
        </div>
        <div class="hidden md:flex space-x-6">
          <a href="/" class="text-white hover:text-gray-300">Home</a>
          <a href="/player-stats" class="text-white hover:text-gray-300"
            >Player Stats</a
          >
        </div>
      </div>
    </nav>

    <div class="container mx-auto px-4 py-8" style="margin-top: 76px">
      <slot />
    </div>
  </div>
</template>

<script setup></script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
}

.container {
  max-width: 1200px;
}
</style>
