<template>
  <footer class="bg-gray-900 text-white py-12 mt-20">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div>
          <h3 class="text-xl font-bold mb-4">Cookie Build</h3>
          <p class="text-gray-400">
            {{ copy.footer.description }}
          </p>
        </div>
        <div>
          <h3 class="text-xl font-bold mb-4">{{ copy.footer.quickLinks }}</h3>
          <ul class="space-y-2">
            <li>
              <NuxtLink :to="localizePath('/')" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.navigation.home }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink :to="localizePath('/games')" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.navigation.games }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink to="/player-stats" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.navigation.playerStats }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink to="/updates" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.navigation.updates }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink to="/status" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.footer.serverStatus }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink to="/rules" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.footer.rules }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink to="/support" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.footer.support }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink to="/account/delete" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.footer.deleteAccount }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink to="/privacy" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.footer.privacy }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink to="/terms" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.footer.terms }}</NuxtLink
              >
            </li>
          </ul>
        </div>
        <div>
          <h3 class="text-xl font-bold mb-4">{{ copy.footer.help }}</h3>
          <p class="text-gray-400 mb-4">
            {{ copy.footer.helpText }}
          </p>
          <a
            href="mailto:support@cookie-build.com"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-black"
          >
            {{ copy.footer.contact }}
          </a>
        </div>
      </div>
      <div class="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
        <p>
          &copy; {{ new Date().getFullYear() }} Cookie Build. {{ copy.footer.legal }}
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const { copy, localizePath } = useSiteLocale();
</script>
