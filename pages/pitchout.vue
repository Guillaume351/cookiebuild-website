<template>
  <GameLandingPage :game="game" />
</template>

<script setup lang="ts">
import GameLandingPage from "@/components/GameLandingPage.vue";
import { localizedGameLandingBySlug } from "@/utils/game-landings-localized";

definePageMeta({ alias: ["/bg/pitchout", "/es/pitchout", "/hi/pitchout", "/pt-br/pitchout"] });

const { locale } = useSiteLocale();
const game = computed(() => localizedGameLandingBySlug(locale.value.code, "pitchout"));
useGameLandingSeo(game);
</script>
