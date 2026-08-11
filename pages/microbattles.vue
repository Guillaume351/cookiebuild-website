<template>
  <GameLandingPage :game="game" />
</template>

<script setup lang="ts">
import GameLandingPage from "@/components/GameLandingPage.vue";
import { gameLandingBySlug } from "@/utils/game-landings";

const game = gameLandingBySlug.microbattles!;
useGameLandingSeo(game);
</script>
