<template>
  <GameLandingPage :game="game" />
</template>

<script setup lang="ts">
import GameLandingPage from "@/components/GameLandingPage.vue";
import { localizedGameLandingBySlug } from "@/utils/game-landings-localized";

definePageMeta({ alias: ["/fr/bedwars", "/de/bedwars", "/it/bedwars", "/bg/bedwars", "/es/bedwars", "/hi/bedwars", "/pt-br/bedwars"] });

const { locale } = useSiteLocale();
const game = computed(() => localizedGameLandingBySlug(locale.value.code, "bedwars"));
useGameLandingSeo(game);
</script>
