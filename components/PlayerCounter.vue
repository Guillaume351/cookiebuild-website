<template>
  <div class="player-counter">
    <Users class="mr-2 h-5 w-5" />
    <span v-if="playerCount !== null">{{ playerCount }} players online</span>
    <span v-else>Loading...</span>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { Users } from "lucide-vue-next";

const playerCount = ref(null);
let intervalId;

const fetchPlayerCount = async () => {
  try {
    const response = await fetch(
      "https://api.mcstatus.io/v2/status/java/play.cookie-build.com"
    );
    const data = await response.json();
    playerCount.value = data.players.online;
  } catch (error) {
    console.error("Failed to fetch player count:", error);
    playerCount.value = null;
  }
};

onMounted(() => {
  fetchPlayerCount();
  intervalId = setInterval(fetchPlayerCount, 60000); // Update every minute
});

onUnmounted(() => {
  clearInterval(intervalId);
});
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
