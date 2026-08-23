<template>
  <div class="player-counter" role="status" aria-live="polite">
    <Users class="mr-2 h-5 w-5" />
    <span v-if="pending">{{ copy.status.checking }}</span>
    <template v-else-if="status">
      <span v-if="status.online && status.players > 0">
        {{ status.players }} {{ status.players === 1 ? copy.status.onePlayer : copy.status.players }} {{ copy.status.online }}
      </span>
      <span v-else-if="status.online">{{ copy.status.onlineZero }}</span>
      <span v-else-if="status.java.reachable && status.bedrock.reachable">{{ copy.status.offline }}</span>
      <span v-else-if="status.java.reachable || status.bedrock.reachable">{{ copy.status.partial }}</span>
      <span v-else>{{ copy.status.unavailable }}</span>
      <span class="edition-status" :aria-label="copy.status.availability">
        <span>Java: {{ editionLabel(status.java) }}</span>
        <span>Bedrock: {{ editionLabel(status.bedrock) }}</span>
      </span>
    </template>
    <span v-else>{{ copy.status.unavailable }}</span>
  </div>
</template>

<script setup lang="ts">
import { Users } from "@lucide/vue";

interface EditionStatus {
  online: boolean;
  reachable: boolean;
  players: number;
}

interface ServerStatus {
  online: boolean;
  players: number;
  java: EditionStatus;
  bedrock: EditionStatus;
}

const { data: status, pending } = useFetch<ServerStatus>("/api/server-status");
const { copy } = useSiteLocale();

function editionLabel(edition: EditionStatus) {
  if (!edition.reachable) return copy.value.status.checkUnavailable;
  return edition.online ? copy.value.status.online : copy.value.status.offline;
}
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
  flex-wrap: wrap;
  gap: 0.25rem;
}

.edition-status {
  display: inline-flex;
  gap: 0.5rem;
  margin-left: 0.5rem;
  padding-left: 0.75rem;
  border-left: 1px solid rgba(255, 255, 255, 0.35);
  color: rgb(228 228 231);
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
