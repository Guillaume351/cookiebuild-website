<template>
  <div class="player-counter">
    <Users class="mr-2 h-5 w-5" />
    <span v-if="pending">Checking server...</span>
    <span v-else-if="status?.online && status.players > 0">{{ status.players }} {{ status.players === 1 ? 'player' : 'players' }} online</span>
    <span v-else-if="status?.online">Server online · Quick Play ready</span>
    <span v-else>Server status unavailable</span>
  </div>
</template>

<script setup lang="ts">
import { Users } from "@lucide/vue";

const { data: status, pending } = useFetch<{ online: boolean; players: number }>("/api/server-status");
</script>

<style scoped>
.player-counter {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  color: white;
  font-weight: bold;
}
</style>
