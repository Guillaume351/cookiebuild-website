<template>
  <div class="space-y-12">
    <!-- Stats Hero -->
    <section class="relative overflow-hidden rounded-3xl bg-zinc-900 text-center text-white shadow-xl py-10">
      <div class="absolute inset-0 z-0 bg-[url('/lobby.webp')] bg-cover bg-center opacity-20 blur-sm"></div>
      <div class="relative z-10 px-6">
        <h1 class="text-3xl md:text-5xl font-bold tracking-tight mb-2 text-white">
          Leaderboard
        </h1>
        <p class="text-sm md:text-base text-zinc-400 max-w-xl mx-auto">
          Ranking of the top players on Cookie Build. Seasonal and all-time statistics.
        </p>
      </div>
    </section>

    <div class="grid gap-8 lg:grid-cols-4 items-start">
      <!-- Sidebar Filters -->
      <aside class="lg:col-span-1 space-y-6">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24">
          <h2 class="text-xl font-bold mb-6 flex items-center gap-2 text-white">
            <Filter class="w-5 h-5 text-orange-500" />
            Filters
          </h2>
          
          <div class="space-y-4">
            <div>
              <label class="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Search Player</label>
              <Input
                v-model="searchQuery"
                placeholder="Username..."
                class="bg-zinc-950 border-zinc-800 focus:ring-orange-500 text-white"
              />
            </div>

            <div>
              <label class="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Game Mode</label>
              <select
                v-model="selectedGamemode"
                class="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orange-500 transition-all outline-none"
              >
                <option value="">All Games</option>
                <option value="MICROBATTLES">Microbattles</option>
                <option value="PITCHOUT">Pitchout</option>
              </select>
            </div>

            <div>
              <label class="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Time Period</label>
              <div class="grid grid-cols-1 gap-2">
                <button 
                  v-for="p in periods" 
                  :key="p.value"
                  @click="selectedPeriod = p.value"
                  :class="[
                    'px-4 py-2 text-sm rounded-lg border transition-all text-left',
                    selectedPeriod === p.value ? 'bg-orange-500 border-orange-400 text-white font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  ]"
                >
                  {{ p.label }}
                </button>
              </div>
            </div>

            <Button 
              v-if="hasFilters" 
              @click="resetFilters" 
              variant="ghost" 
              class="w-full text-zinc-500 hover:text-white"
            >
              Reset All
            </Button>
          </div>
        </div>
      </aside>

      <!-- Main Leaderboard -->
      <div class="lg:col-span-3">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <!-- Table Header -->
          <div class="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
            <div>
               <h2 class="text-xl font-bold text-white">Leaderboard</h2>
               <p class="text-sm text-zinc-500">Ranking by total wins</p>
            </div>
            <div class="text-xs font-mono text-zinc-500 bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">
               {{ filteredStats.length }} PLAYERS FOUND
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="pending" class="py-32 text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
            <p class="mt-4 text-zinc-500 font-medium">Synchronizing stats...</p>
          </div>

          <!-- Error -->
          <div v-else-if="error" class="p-12 text-center text-red-400">
            <AlertTriangle class="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p class="font-bold">Failed to load statistics</p>
            <p class="text-sm opacity-70">{{ error.message }}</p>
          </div>

          <!-- Table -->
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="text-zinc-500 text-xs uppercase tracking-widest border-b border-zinc-800 bg-zinc-950/50">
                  <th class="px-6 py-4 font-black">Rank</th>
                  <th class="px-6 py-4 font-black">Player</th>
                  <th class="px-6 py-4 font-black">Edition</th>
                  <th class="px-6 py-4 font-black text-right">Wins</th>
                  <th class="px-6 py-4 font-black text-right">W/L Rate</th>
                  <th class="px-6 py-4 font-black text-right">Time Played</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-800/50">
                <tr 
                  v-for="(stat, index) in paginatedStats" 
                  :key="stat.id"
                  class="group hover:bg-orange-500/5 transition-colors"
                >
                  <td class="px-6 py-4">
                    <div class="flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm shadow-inner"
                      :class="getRankClass(startIndex + index + 1)"
                    >
                      {{ startIndex + index + 1 }}
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="relative">
                        <img
                          v-if="!isBedrockPlayer(stat.name) && stat.name"
                          :src="`https://mc-heads.net/avatar/${encodeURIComponent(formatPlayerName(stat.name))}/32`"
                          class="w-10 h-10 rounded-lg shadow-lg group-hover:scale-110 transition-transform"
                        />
                        <div v-else class="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-600">
                           <User class="w-5 h-5" />
                        </div>
                      </div>
                      <span class="font-bold text-zinc-200 group-hover:text-white transition-colors">
                        {{ formatPlayerName(stat.name) }}
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <Badge 
                      :variant="isBedrockPlayer(stat.name) ? 'secondary' : 'default'"
                      class="font-black text-[10px] uppercase tracking-tighter"
                      :class="isBedrockPlayer(stat.name) ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'"
                    >
                      {{ isBedrockPlayer(stat.name) ? 'Bedrock' : 'Java' }}
                    </Badge>
                  </td>
                  <td class="px-6 py-4 text-right font-mono font-bold text-orange-500">
                    {{ stat.wins }}
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div class="text-sm font-bold text-zinc-300">
                      {{ getWinRate(stat) }}%
                    </div>
                    <div class="text-[10px] text-zinc-600 font-mono uppercase">
                      {{ stat.wins }}W / {{ stat.losses }}L
                    </div>
                  </td>
                  <td class="px-6 py-4 text-right text-xs text-zinc-500 font-medium">
                    {{ formatPlaytime(stat.playtime) }}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Empty -->
            <div v-if="filteredStats.length === 0" class="py-20 text-center">
               <Ghost class="w-12 h-12 mx-auto mb-4 text-zinc-800" />
               <p class="text-zinc-500 font-medium">No players found.</p>
            </div>
          </div>

          <!-- Pagination -->
          <div class="p-6 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <p class="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">
              Showing {{ startIndex + 1 }} to {{ endIndex }} of {{ filteredStats.length }}
            </p>
            <div class="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                @click="prevPage" 
                :disabled="currentPage === 1"
                class="bg-zinc-900 border-zinc-800 disabled:opacity-30 text-white"
              >
                <ChevronLeft class="w-4 h-4" />
              </Button>
              <div class="flex gap-1">
                <Button 
                  v-for="p in visiblePages" 
                  :key="p"
                  @click="currentPage = p"
                  size="sm"
                  :variant="currentPage === p ? 'default' : 'outline'"
                  :class="currentPage === p ? 'bg-orange-500 hover:bg-orange-600 border-orange-400 text-white font-bold' : 'bg-zinc-900 border-zinc-800 text-white'"
                >
                  {{ p }}
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                @click="nextPage" 
                :disabled="currentPage === totalPages"
                class="bg-zinc-900 border-zinc-800 disabled:opacity-30 text-white"
              >
                <ChevronRight class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge.vue";
import { 
  Filter, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  Ghost 
} from "lucide-vue-next";

interface PlayerStat {
  id: string;
  name?: string;
  wins: number;
  losses: number;
  playtime?: bigint;
}

const selectedGamemode = ref<string | null>("");
const selectedPeriod = ref("all");

const periods = [
  { value: "all", label: "All Time" },
  { value: "month", label: "This Month" },
  { value: "week", label: "This Week" },
];

const { data, pending, error, refresh } = useFetch<{ data: PlayerStat[] }>(
  "/api/player-stats",
  {
    query: {
      gamemode: selectedGamemode,
      period: selectedPeriod,
    },
  }
);

const stats = computed(() => data.value?.data || []);
const searchQuery = ref("");
const currentPage = ref(1);
const pageSize = 10;

const hasFilters = computed(() => {
  return selectedGamemode.value !== "" || selectedPeriod.value !== "all" || searchQuery.value !== "";
});

const filteredStats = computed(() => {
  let result = [...stats.value];
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter((stat) => stat.name?.toLowerCase().includes(query));
  }
  return result.sort((a, b) => Number(b.wins) - Number(a.wins));
});

const totalPages = computed(() => Math.ceil(filteredStats.value.length / pageSize));
const startIndex = computed(() => (currentPage.value - 1) * pageSize);
const endIndex = computed(() => Math.min(startIndex.value + pageSize, filteredStats.value.length));
const paginatedStats = computed(() => filteredStats.value.slice(startIndex.value, endIndex.value));

const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage.value - 2);
  let end = Math.min(totalPages.value, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

function prevPage() { if (currentPage.value > 1) currentPage.value--; }
function nextPage() { if (currentPage.value < totalPages.value) currentPage.value++; }
function resetFilters() {
  selectedGamemode.value = "";
  selectedPeriod.value = "all";
  searchQuery.value = "";
}

function formatPlayerName(name?: string) {
  if (!name) return "Anonymous";
  return name.startsWith(".") ? name.substring(1) : name;
}

function isBedrockPlayer(name?: string) {
  return name?.startsWith(".");
}

function getWinRate(stat: PlayerStat) {
  const total = Number(stat.wins) + Number(stat.losses);
  return total > 0 ? ((Number(stat.wins) / total) * 100).toFixed(1) : "0";
}

function getRankClass(rank: number) {
  if (rank === 1) return "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50";
  if (rank === 2) return "bg-zinc-400/20 text-zinc-400 border border-zinc-400/50";
  if (rank === 3) return "bg-orange-700/20 text-orange-700 border border-orange-700/50";
  return "bg-zinc-950 text-zinc-500 border border-zinc-800";
}

function formatPlaytime(playtime?: bigint) {
  if (!playtime) return "0h";
  try {
    const hours = Math.floor(Number(playtime) / 3600000);
    return `${hours}h`;
  } catch { return "0h"; }
}

watch([searchQuery, selectedGamemode, selectedPeriod], () => {
  currentPage.value = 1;
  refresh();
});
</script>
