<template>
  <footer class="bg-gray-900 text-white py-12 mt-20">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
          <h3 class="text-xl font-bold mb-4">Cookie Build</h3>
          <p class="text-gray-400">
            {{ copy.footer.description }}
          </p>
          <p class="mt-4">
            <NuxtLink :to="localizePath('/history')" class="font-bold text-orange-300 hover:text-orange-200">{{ copy.footer.history }}</NuxtLink>
          </p>
          <ul class="mt-4 flex flex-wrap gap-3 text-sm">
            <li><a :href="DISCORD_INVITE_URL" target="_blank" rel="noopener" class="inline-flex min-h-11 items-center rounded-lg bg-indigo-600 px-4 font-bold text-white hover:bg-indigo-500" @click="siteAnalytics.track('discord_open')">Discord</a></li>
            <li><a :href="X_PROFILE_URL" target="_blank" rel="noopener" class="inline-flex min-h-11 items-center rounded-lg border border-gray-700 px-4 font-bold text-gray-300 hover:text-white">X</a></li>
          </ul>
        </div>
        <div>
          <h3 class="text-xl font-bold mb-4">{{ copy.footer.play }}</h3>
          <ul class="space-y-2">
            <li><NuxtLink :to="localizePath('/join')" class="text-gray-400 hover:text-white transition-colors">{{ copy.footer.joinGuide }}</NuxtLink></li>
            <li><NuxtLink :to="localizePath('/join/java')" class="text-gray-400 hover:text-white transition-colors">Java (PC, Mac, Linux)</NuxtLink></li>
            <li><NuxtLink :to="localizePath('/join/mobile')" class="text-gray-400 hover:text-white transition-colors">{{ copy.footer.joinMobile }}</NuxtLink></li>
            <li><NuxtLink :to="localizePath('/join/playstation')" class="text-gray-400 hover:text-white transition-colors">PlayStation</NuxtLink></li>
            <li><NuxtLink :to="localizePath('/join/xbox')" class="text-gray-400 hover:text-white transition-colors">Xbox</NuxtLink></li>
            <li><NuxtLink :to="localizePath('/join/switch')" class="text-gray-400 hover:text-white transition-colors">Nintendo Switch</NuxtLink></li>
          </ul>
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
            <li><NuxtLink :to="localizePath('/maps')" class="text-gray-400 hover:text-white transition-colors">{{ copy.navigation.maps }}</NuxtLink></li>
            <li><NuxtLink :to="localizePath('/builds')" class="text-gray-400 hover:text-white transition-colors">{{ copy.navigation.builds }}</NuxtLink></li>
            <li>
              <NuxtLink :to="localizePath('/player-stats')" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.navigation.playerStats }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink :to="localizePath('/updates')" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.navigation.updates }}</NuxtLink
              >
            </li>
            <li><NuxtLink :to="localizePath('/shop')" @click="siteAnalytics.track('shop_entry')" class="text-gray-400 hover:text-white transition-colors">{{ copy.navigation.shop }}</NuxtLink></li>
            <li>
              <NuxtLink :to="localizePath('/status')" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.footer.serverStatus }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink :to="localizePath('/rules')" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.footer.rules }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink :to="localizePath('/support')" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.footer.support }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink :to="localizePath('/account/delete')" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.footer.deleteAccount }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink :to="localizePath('/privacy')" class="text-gray-400 hover:text-white transition-colors"
                >{{ copy.footer.privacy }}</NuxtLink
              >
            </li>
            <li>
              <NuxtLink :to="localizePath('/terms')" class="text-gray-400 hover:text-white transition-colors"
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
    <div v-if="analytics.enabled" class="container mx-auto px-4 pb-6 text-center">
      <button class="min-h-11 px-3 text-sm text-zinc-400 underline hover:text-white" @click="analytics.preferencesOpen.value = true">{{ copy.footer.analyticsPreferences }}</button>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { DISCORD_INVITE_URL, X_PROFILE_URL } from "@/utils/site-links";

const siteAnalytics = useSiteAnalytics();
const analytics = useShopAnalytics();
const { copy, localizePath } = useSiteLocale();
</script>
