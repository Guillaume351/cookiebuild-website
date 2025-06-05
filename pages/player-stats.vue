<template>
  <div>
    <div class="container mx-auto px-4 py-8" style="margin-top: 76px">
      <div class="text-center mb-10">
        <h1 class="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          Player Statistics
        </h1>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto">
          Track player performance across all game modes
        </p>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="mb-6 flex items-center justify-between">
          <Input
            v-model="searchQuery"
            placeholder="Search players..."
            class="w-full max-w-md"
          />
          <div class="text-sm text-gray-600">
            Showing {{ startIndex + 1 }} - {{ endIndex }} of
            {{ filteredStats.length }} players
          </div>
        </div>

        <div v-if="pending" class="text-center py-10">
          <div
            class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"
          ></div>
          <p class="mt-2">Loading player stats...</p>
        </div>

        <div
          v-else-if="error"
          class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          {{ error.message }}
        </div>

        <div v-else>
          <div class="overflow-x-auto">
            <table
              class="min-w-full bg-white border border-gray-200 rounded-lg"
            >
              <thead>
                <tr class="bg-gray-50">
                  <th class="py-3 px-4 text-left font-semibold text-gray-700">
                    Player
                  </th>
                  <th class="py-3 px-4 text-left font-semibold text-gray-700">
                    Platform
                  </th>
                  <th class="py-3 px-4 text-left font-semibold text-gray-700">
                    Kills
                  </th>
                  <th class="py-3 px-4 text-left font-semibold text-gray-700">
                    Deaths
                  </th>
                  <th class="py-3 px-4 text-left font-semibold text-gray-700">
                    Assists
                  </th>
                  <th class="py-3 px-4 text-left font-semibold text-gray-极7">
                    K/D Ratio
                  </th>
                  <th class="py-3 px-4 text-left font-semibold text-gray-700">
                    Playtime
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="stat in paginatedStats"
                  :key="stat.id"
                  class="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td class="py-3 px-4">
                    <div class="flex items-center">
                      <img
                        v-if="!isBedrockPlayer(stat.name) && stat.name"
                        :src="`https://mc-heads.net/avatar/${encodeURIComponent(
                          formatPlayerName(stat.name)
                        )}/16`"
                        class="w-8 h-8 mr-3 rounded"
                      />
                      <div
                        v-else
                        class="bg-gray-200 border-2 border-dashed rounded-xl w-8 h-8 mr-3"
                      />
                      <span class="font-medium">{{
                        formatPlayerName(stat.name)
                      }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <span
                      v-if="isBedrockPlayer(stat.name)"
                      class="text-blue-500"
                      >Bedrock</span
                    >
                    <span v-else class="text-green-500">Java</span>
                  </td>
                  <td class="py-3 px-4">{{ stat.kills || 0 }}</td>
                  <td class="py-3 px-4">{{ stat.deaths || 0 }}</td>
                  <td class="py-3 px-4">{{ stat.assists || 0 }}</td>
                  <td class="py-3 px-4">
                    {{
                      stat.deaths
                        ? (stat.kills / stat.deaths).toFixed(2)
                        : stat.kills
                        ? "∞"
                        : "0.00"
                    }}
                  </td>
                  <td class="py-3 px-4">{{ formatPlaytime(stat.playtime) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-if="filteredStats.length === 0"
            class="text-center py-10 text-gray-500"
          >
            No player stats found matching your search
          </div>

          <div v-else class="flex justify-center mt-6">
            <div class="flex space-x-2">
              <button
                @click="prevPage"
                :disabled="currentPage === 1"
                class="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                v-for="page in visiblePages"
                :key="page"
                @click="currentPage = page"
                :class="[
                  'px-3 py-1 border rounded',
                  currentPage === page ? 'bg-gray-200' : '',
                ]"
              >
                {{ page }}
              </button>
              <button
                @click="nextPage"
                :disabled="currentPage === totalPages"
                class="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from "@/components/ui/input";

interface PlayerStat {
  id: string;
  name?: string;
  kills: number;
  deaths: number;
  assists: number;
  playtime?: bigint;
}

const { data, pending, error } = await useFetch<{ data: PlayerStat[] }>(
  "/api/player-stats"
);
const stats = computed(() => data.value?.data || []);
const searchQuery = ref("");
const currentPage = ref(1);
const pageSize = 10; // Fixed page size

// Filter and sort stats
const filteredStats = computed(() => {
  let result = [...stats.value];

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter((stat) => stat.name?.toLowerCase().includes(query));
  }

  // Sort by kills descending
  return result.sort((a, b) => b.kills - a.kills);
});

// Pagination
const totalPages = computed(() =>
  Math.ceil(filteredStats.value.length / pageSize)
);
const startIndex = computed(() => (currentPage.value - 1) * pageSize);
const endIndex = computed(() =>
  Math.min(startIndex.value + pageSize, filteredStats.value.length)
);
const paginatedStats = computed(() =>
  filteredStats.value.slice(startIndex.value, endIndex.value)
);

// Visible pages for pagination
const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage.value - 2);
  let end = Math.min(totalPages.value, start + maxVisible - 1);

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return pages;
});

function prevPage() {
  if (currentPage.value > 1) currentPage.value--;
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++;
}

// Format player name
function formatPlayerName(name?: string) {
  if (!name) return "Unknown Player";
  return name.startsWith(".") ? name.substring(1) : name;
}

// Check if player is on Bedrock edition
function isBedrockPlayer(name?: string) {
  return name?.startsWith(".");
}

// Format playtime in hours:minutes
function formatPlaytime(playtime?: bigint) {
  if (!playtime) return "0h 0m";

  try {
    const totalSeconds = Number(playtime) / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  } catch {
    return "0h 0m";
  }
}

// Reset pagination when search changes
watch(searchQuery, () => {
  currentPage.value = 1;
});
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
}

.container {
  max-width: 1200px;
}
</style>
