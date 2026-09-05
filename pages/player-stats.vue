<template>
  <div class="space-y-12">
    <LanguageFallbackNotice :available-locales="['en']" />
    <!-- Stats Hero -->
    <section class="relative overflow-hidden rounded-3xl bg-zinc-900 text-center text-white shadow-xl py-10">
      <div class="absolute inset-0 z-0 bg-[url('/lobby-hero-960.webp')] bg-cover bg-center opacity-20 blur-sm"></div>
      <div class="relative z-10 px-6">
        <h1 class="text-3xl md:text-5xl font-bold tracking-tight mb-2 text-white">
          Leaderboard
        </h1>
        <p class="text-sm md:text-base text-zinc-400 max-w-xl mx-auto">
          Completed-match rankings with calendar-period filters and personal progression.
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
                <option value="MicroBattles">MicroBattles</option>
                <option value="Pitchout">Pitchout</option>
                <option value="SkyWars">SkyWars</option>
                <option value="BuildBattles">Build Battles</option>
                <option value="TurfWars">TurfWars</option>
                <option value="BedWars">BedWars</option>
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
      <div class="min-w-0 lg:col-span-3 space-y-6">
        <section
          v-if="selectedPlayer"
          class="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-zinc-900 p-6"
          :class="selectedPlayer.supporterProfileFrame ? 'ring-2 ring-amber-300 shadow-[0_0_42px_rgba(251,191,36,.24)]' : ''"
          :aria-label="selectedPlayer.supporterProfileFrame ? `Player profile for ${formatPlayerName(selectedPlayer.name)}, Supporter Biscuit frame active` : `Player profile for ${formatPlayerName(selectedPlayer.name)}`"
        >
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-black uppercase tracking-widest text-orange-500">Player profile</p>
              <h2 class="mt-1 text-2xl font-black text-white">{{ formatPlayerName(selectedPlayer.name) }}</h2>
              <p v-if="selectedPlayer.supporterProfileFrame" class="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-amber-200">
                <span aria-hidden="true">🍪</span> Cadre Biscuit doré actif
              </p>
              <p class="mt-1 text-sm text-zinc-500">
                {{ selectedPlayer.lastMatchAt ? `Last completed match ${formatDate(selectedPlayer.lastMatchAt)}` : 'No completed match yet' }}
              </p>
            </div>
            <button class="rounded-lg p-2 text-zinc-500 hover:bg-white/10 hover:text-white" aria-label="Close player profile" @click="selectedPlayer = null">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ProfileMetric label="Matches" :value="selectedPlayer.matches" />
            <ProfileMetric
              :label="selectedGamemode === 'BuildBattles' ? 'Build score' : selectedGamemode === 'TurfWars' ? 'Arrow hits' : 'Kills'"
              :value="selectedGamemode === 'BuildBattles' ? selectedPlayer.score : selectedPlayer.kills"
            />
            <ProfileMetric label="Coins" :value="selectedPlayer.coins" />
            <ProfileMetric label="Playtime" :value="formatPlaytime(selectedPlayer.playtime)" />
          </div>
          <div v-if="selectedPlayer.progression.length" class="mt-5 grid gap-3 sm:grid-cols-2">
            <div v-for="progress in selectedPlayer.progression" :key="progress.minigame" class="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
              <div class="flex items-center justify-between">
                <strong class="text-white">{{ formatGamemode(progress.minigame) }}</strong>
                <span class="text-sm font-black text-orange-500">Level {{ progress.level }}</span>
              </div>
              <div class="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div class="h-full rounded-full bg-orange-500" :style="{ width: `${progressPercent(progress)}%` }"></div>
              </div>
              <p class="mt-2 text-xs text-zinc-500">
                {{ progress.experience }} XP · {{ experienceRemaining(progress) }} XP to next level
                <span v-if="progress.selectedKit"> · {{ progress.selectedKit }} {{ progress.selectedKitLevel ? `T${progress.selectedKitLevel}` : '' }}</span>
              </p>
            </div>
          </div>
        </section>

        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <!-- Table Header -->
          <div class="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
            <div>
               <h2 class="text-xl font-bold text-white">Leaderboard</h2>
               <p class="text-sm text-zinc-500">Ranking by total wins</p>
            </div>
            <div class="text-xs font-mono text-zinc-500 bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">
               {{ pagination?.total ?? 0 }} PLAYERS FOUND
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
                  <th class="px-6 py-4 font-black text-right">Win Rate</th>
                  <th class="px-6 py-4 font-black text-right">Time Played</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-800/50">
                <tr 
                  v-for="(stat, index) in paginatedStats" 
                  :key="stat.id"
                  class="group cursor-pointer hover:bg-orange-500/5 transition-colors"
                  tabindex="0"
                  :aria-label="`Open player profile for ${formatPlayerName(stat.name)}${stat.supporterProfileFrame ? ', Supporter frame active' : ''}`"
                  @click="selectedPlayer = stat"
                  @keydown.enter="selectedPlayer = stat"
                  @keydown.space.prevent="selectedPlayer = stat"
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
                      <div class="relative rounded-xl" :class="stat.supporterProfileFrame ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-zinc-900' : ''">
                        <img
                          v-if="!isBedrockPlayer(stat.name) && stat.name"
                          :src="`/api/player-avatar/${encodeURIComponent(stat.id)}?size=32`"
                          :alt="`${formatPlayerName(stat.name)} avatar`"
                          class="w-10 h-10 rounded-lg shadow-lg group-hover:scale-110 transition-transform"
                        />
                        <div v-else class="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-600">
                           <User class="w-5 h-5" />
                        </div>
                        <span v-if="stat.supporterProfileFrame" aria-hidden="true" class="absolute -bottom-2 -right-2 grid h-5 w-5 place-items-center rounded-full border border-amber-200 bg-amber-500 text-[10px] shadow-lg">🍪</span>
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
            <div v-if="paginatedStats.length === 0" class="py-20 text-center">
               <Ghost class="w-12 h-12 mx-auto mb-4 text-zinc-800" />
               <p class="text-zinc-500 font-medium">No players found.</p>
            </div>
          </div>

          <!-- Pagination -->
          <div class="p-6 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <p class="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">
              Showing {{ pagination?.total ? startIndex + 1 : 0 }} to {{ endIndex }} of {{ pagination?.total ?? 0 }}
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
import { publicPageSeo } from "@/utils/public-page-seo";

definePageMeta({ alias: ["/fr/player-stats", "/de/player-stats", "/it/player-stats", "/bg/player-stats", "/es/player-stats", "/hi/player-stats", "/pt-br/player-stats"] });

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge.vue";
import ProfileMetric from "@/components/ProfileMetric.vue";
import { refDebounced } from "@vueuse/core";
import { 
  Filter, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  Ghost,
  X,
} from "@lucide/vue";

interface ProgressionSummary {
  minigame: string;
  level: number;
  experience: number;
  selectedKit: string | null;
  selectedKitLevel: number;
}

interface PlayerStat {
  id: string;
  name?: string;
  wins: number;
  losses: number;
  matches: number;
  kills: number;
  score: number;
  deaths: number;
  coins: number;
  playtime?: number;
  lastMatchAt: string | null;
  supporterProfileFrame: boolean;
  progression: ProgressionSummary[];
}

const selectedGamemode = ref<string | null>("");
const selectedPeriod = ref("all");
const searchQuery = ref("");
const debouncedSearch = refDebounced(searchQuery, 300);
const currentPage = ref(1);
const pageSize = 10;
const selectedPlayer = ref<PlayerStat | null>(null);

const periods = [
  { value: "all", label: "All Time" },
  { value: "season", label: "Current Season" },
  { value: "month", label: "This Month" },
  { value: "week", label: "This Week" },
];

const { data, pending, error } = useFetch<{
  data: PlayerStat[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}>(
  "/api/player-stats",
  {
    query: {
      gamemode: selectedGamemode,
      period: selectedPeriod,
      search: debouncedSearch,
      page: currentPage,
      pageSize,
    },
  }
);

const stats = computed(() => data.value?.data || []);
const pagination = computed(() => data.value?.pagination);

const hasFilters = computed(() => {
  return selectedGamemode.value !== "" || selectedPeriod.value !== "all" || searchQuery.value !== "";
});

const totalPages = computed(() => pagination.value?.totalPages ?? 1);
const startIndex = computed(() => (currentPage.value - 1) * pageSize);
const endIndex = computed(() => Math.min(startIndex.value + stats.value.length, pagination.value?.total ?? 0));
const paginatedStats = computed(() => stats.value);

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

function formatGamemode(gamemode: string) {
  const labels: Record<string, string> = {
    microbattles: "MicroBattles",
    pitchout: "Pitchout",
    skywars: "SkyWars",
    buildbattles: "Build Battles",
    turfwars: "TurfWars",
    bedwars: "BedWars",
  };
  return labels[gamemode.toLowerCase()] ?? gamemode;
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

function formatPlaytime(playtime?: number) {
  if (!playtime) return "0h";
  try {
    const hours = Math.floor(Number(playtime) / 3600000);
    return `${hours}h`;
  } catch { return "0h"; }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function nextLevelExperience(progress: ProgressionSummary) {
  return progress.level * progress.level * 100;
}

function currentLevelExperience(progress: ProgressionSummary) {
  return Math.max(0, progress.level - 1) ** 2 * 100;
}

function experienceRemaining(progress: ProgressionSummary) {
  return Math.max(0, nextLevelExperience(progress) - progress.experience);
}

function progressPercent(progress: ProgressionSummary) {
  const floor = currentLevelExperience(progress);
  const range = nextLevelExperience(progress) - floor;
  return Math.max(0, Math.min(100, ((progress.experience - floor) / range) * 100));
}

watch([debouncedSearch, selectedGamemode, selectedPeriod], () => {
  currentPage.value = 1;
  selectedPlayer.value = null;
});

const { locale } = useSiteLocale();
const seo = computed(() => publicPageSeo(locale.value.code, "playerStats"));
useLocalizedSeo("/player-stats", () => seo.value.title, () => seo.value.description);
</script>
