<template>
  <GameLandingPage :game="game" />
</template>

<script setup lang="ts">
import GameLandingPage from "@/components/GameLandingPage.vue";
import { localizedGameLandingBySlug } from "@/utils/game-landings-localized";

definePageMeta({ alias: ["/fr/microbattles", "/de/microbattles", "/it/microbattles", "/bg/microbattles", "/es/microbattles", "/hi/microbattles", "/pt-br/microbattles"] });

const { locale } = useSiteLocale();
const game = computed(() => localizedGameLandingBySlug(locale.value.code, "microbattles"));
useGameLandingSeo(game);
</script>
