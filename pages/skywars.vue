<template>
  <GameLandingPage :game="game" />
</template>

<script setup lang="ts">
import GameLandingPage from "@/components/GameLandingPage.vue";
import { localizedGameLandingBySlug } from "@/utils/game-landings-localized";

definePageMeta({ alias: ["/bg/skywars", "/es/skywars", "/hi/skywars", "/pt-br/skywars"] });

const { locale } = useSiteLocale();
const game = computed(() => localizedGameLandingBySlug(locale.value.code, "skywars"));
useGameLandingSeo(game);
</script>
