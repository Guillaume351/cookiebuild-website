<template>
  <footer class="bg-gray-900 text-white py-12 mt-20">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div>
          <h3 class="text-xl font-bold mb-4">Cookie Build</h3>
          <p class="text-gray-400">
            The Classic Minecraft Mini-Games Server, bringing players together
            since 2014.
          </p>
        </div>
        <div>
          <h3 class="text-xl font-bold mb-4">Quick Links</h3>
          <ul class="space-y-2">
            <li>
              <NuxtLink to="/" class="text-gray-400 hover:text-white transition-colors"
                >Home</NuxtLink
              >
            </li>
            <li>
              <NuxtLink to="/player-stats" class="text-gray-400 hover:text-white transition-colors"
                >Player Stats</NuxtLink
              >
            </li>
          </ul>
        </div>
        <div>
          <h3 class="text-xl font-bold mb-4">Support</h3>
          <p class="text-gray-400 mb-4">
            Need help? Contact our support team.
          </p>
          <a
            href="mailto:support@cookie-build.com"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-black"
          >
            Contact Support
          </a>
        </div>
      </div>
      <div class="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
        <p>
          &copy; {{ new Date().getFullYear() }} Cookie Build. Not affiliated with Mojang or Microsoft.
        </p>
      </div>
    </div>
  </footer>
</template>
