<template>
  <GameLandingPage :game="game" />
</template>

<script setup lang="ts">
import GameLandingPage from "@/components/GameLandingPage.vue";
import { localizedGameLandingBySlug } from "@/utils/game-landings-localized";

definePageMeta({ alias: ["/bg/build-battle", "/es/build-battle", "/hi/build-battle", "/pt-br/build-battle"] });

const { locale } = useSiteLocale();
const game = computed(() => localizedGameLandingBySlug(locale.value.code, "build-battle"));
useGameLandingSeo(game);
</script>
