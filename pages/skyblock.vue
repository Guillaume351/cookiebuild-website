<template>
  <GameLandingPage :game="game" />
</template>

<script setup lang="ts">
import GameLandingPage from "@/components/GameLandingPage.vue";
import { localizedGameLandingBySlug } from "@/utils/game-landings-localized";

definePageMeta({ alias: ["/fr/skyblock", "/de/skyblock", "/it/skyblock", "/bg/skyblock", "/es/skyblock", "/hi/skyblock", "/pt-br/skyblock"] });

const { locale } = useSiteLocale();
const game = computed(() => localizedGameLandingBySlug(locale.value.code, "skyblock"));
useGameLandingSeo(game);
</script>
