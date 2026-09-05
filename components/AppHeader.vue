<template>
  <nav class="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-md">
    <div
      class="container mx-auto flex items-center justify-between px-4 py-3"
    >
      <div class="flex items-center">
        <NuxtLink :to="localizePath('/')" class="flex items-center">
          <img
            src="/android-chrome-192x192.png"
            alt="Cookie Build"
            class="h-10 w-10 mr-3"
          />
          <span class="text-xl font-bold text-white">Cookie Build</span>
        </NuxtLink>
      </div>
      <div class="hidden items-center space-x-4 text-sm lg:flex">
        <NuxtLink :to="localizePath('/')" class="text-white hover:text-gray-300 transition-colors">{{ copy.navigation.home }}</NuxtLink>
        <NuxtLink :to="localizePath('/games')" class="text-white hover:text-gray-300 transition-colors">{{ copy.navigation.games }}</NuxtLink>
        <NuxtLink :to="localizePath('/player-stats')" class="text-white hover:text-gray-300 transition-colors"
          >{{ copy.navigation.playerStats }}</NuxtLink
        >
        <NuxtLink :to="localizePath('/updates')" class="text-white hover:text-gray-300 transition-colors">{{ copy.navigation.updates }}</NuxtLink>
        <NuxtLink :to="localizePath('/shop')" class="text-white hover:text-gray-300 transition-colors">{{ locale.code === "fr" ? "Boutique" : "Shop" }}</NuxtLink>
        <NuxtLink :to="localizePath('/status')" class="text-white hover:text-gray-300 transition-colors">{{ copy.navigation.status }}</NuxtLink>
        <label class="relative">
          <span class="sr-only">{{ copy.navigation.language }}</span>
          <select
            :value="locale.code"
            class="min-h-10 rounded-lg border border-white/15 bg-zinc-950/90 px-3 pr-8 text-sm font-bold text-white outline-none ring-orange-400 focus:ring-2"
            :aria-label="copy.navigation.language"
            @change="changeLanguage"
          >
            <option v-for="language in SITE_LOCALES" :key="language.code" :value="language.code" :selected="language.code === locale.code">
              {{ language.flag }} {{ language.nativeLabel }}
            </option>
          </select>
        </label>
      </div>
      <button
        type="button"
        class="rounded-lg border border-white/15 p-2 text-white transition-colors hover:bg-white/10 lg:hidden"
        :aria-expanded="mobileMenuOpen"
        aria-controls="mobile-navigation"
        :aria-label="copy.navigation.toggle"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <X v-if="mobileMenuOpen" class="h-5 w-5" />
        <Menu v-else class="h-5 w-5" />
      </button>
    </div>
    <div
      v-if="mobileMenuOpen"
      id="mobile-navigation"
      class="border-t border-white/10 bg-zinc-950/95 px-4 py-3 lg:hidden"
    >
      <div class="container mx-auto flex flex-col gap-1">
        <NuxtLink
          :to="localizePath('/')"
          class="rounded-lg px-3 py-3 text-white hover:bg-white/10"
          @click="mobileMenuOpen = false"
        >
          {{ copy.navigation.home }}
        </NuxtLink>
        <NuxtLink
          :to="localizePath('/games')"
          class="rounded-lg px-3 py-3 text-white hover:bg-white/10"
          @click="mobileMenuOpen = false"
        >
          {{ copy.navigation.games }}
        </NuxtLink>
        <NuxtLink
          :to="localizePath('/player-stats')"
          class="rounded-lg px-3 py-3 text-white hover:bg-white/10"
          @click="mobileMenuOpen = false"
        >
          {{ copy.navigation.playerStats }}
        </NuxtLink>
        <NuxtLink
          :to="localizePath('/updates')"
          class="rounded-lg px-3 py-3 text-white hover:bg-white/10"
          @click="mobileMenuOpen = false"
        >
          {{ copy.navigation.updates }}
        </NuxtLink>
        <NuxtLink :to="localizePath('/shop')" class="rounded-lg px-3 py-3 text-white hover:bg-white/10" @click="mobileMenuOpen = false">{{ locale.code === "fr" ? "Boutique" : "Shop" }}</NuxtLink>
        <NuxtLink
          :to="localizePath('/status')"
          class="rounded-lg px-3 py-3 text-white hover:bg-white/10"
          @click="mobileMenuOpen = false"
        >
          {{ copy.navigation.status }}
        </NuxtLink>
        <label class="mt-2 border-t border-white/10 pt-3">
          <span class="mb-2 block px-3 text-xs font-bold uppercase tracking-wider text-zinc-400">{{ copy.navigation.language }}</span>
          <select
            :value="locale.code"
            class="min-h-11 w-full rounded-lg border border-white/15 bg-zinc-900 px-3 text-white outline-none ring-orange-400 focus:ring-2"
            :aria-label="copy.navigation.language"
            @change="changeLanguage"
          >
            <option v-for="language in SITE_LOCALES" :key="language.code" :value="language.code" :selected="language.code === locale.code">
              {{ language.flag }} {{ language.nativeLabel }}
            </option>
          </select>
        </label>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { Menu, X } from "@lucide/vue";
import { SITE_LOCALES, type SiteLocaleCode } from "@/utils/site-locales";

const mobileMenuOpen = ref(false);
const route = useRoute();
const { locale, copy, localizePath, switchLocalePath } = useSiteLocale();

const changeLanguage = async (event: Event) => {
  const code = (event.target as HTMLSelectElement).value as SiteLocaleCode;
  const target = switchLocalePath(code);
  mobileMenuOpen.value = false;
  if (target === route.path) return;
  // A full document navigation guarantees that Nuxt resolves the translated
  // route and refreshes every SSR SEO signal, even when two URLs are aliases
  // of the same page record.
  await navigateTo(target, { external: true });
};
</script>
