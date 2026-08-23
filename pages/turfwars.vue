<template>
  <GameLandingPage :game="game" />
</template>

<script setup lang="ts">
import GameLandingPage from "@/components/GameLandingPage.vue";
import { localizedGameLandingBySlug } from "@/utils/game-landings-localized";

definePageMeta({ alias: ["/bg/turfwars", "/es/turfwars", "/hi/turfwars", "/pt-br/turfwars"] });

const { locale } = useSiteLocale();
const game = computed(() => localizedGameLandingBySlug(locale.value.code, "turfwars"));
useGameLandingSeo(game);
</script>
