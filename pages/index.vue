<template>
  <div class="space-y-20">
    <!-- Hero Section -->
    <section
      class="relative overflow-hidden rounded-3xl bg-gray-900 text-center text-white shadow-2xl"
    >
      <div class="hero-lobby absolute inset-0 z-0 bg-cover bg-center opacity-50 transition-transform duration-1000 hover:scale-105"></div>
      <div
        class="absolute inset-0 z-10 bg-gradient-to-t from-gray-900 via-transparent to-black/30"
      ></div>

      <div class="relative z-20 px-6 py-24 md:py-32">
        <h1
          class="mb-6 text-5xl font-extrabold tracking-tight md:text-7xl drop-shadow-lg"
        >
          Cookie Build <span class="text-orange-500">🍪</span>
        </h1>
        <p
          class="mx-auto mb-10 max-w-2xl text-xl font-medium text-gray-200 md:text-2xl drop-shadow-md"
        >
          {{ copy.home.hero }} <br />
          <span class="text-orange-400">Java</span> &
          <span class="text-green-400">Bedrock</span>
        </p>

        <div
          class="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <div class="flex items-center gap-2 rounded-lg bg-black/50 p-1 pl-4 backdrop-blur">
            <input
              type="text"
              readonly
              :value="serverIP"
              class="w-48 bg-transparent text-sm font-mono text-white focus:outline-none md:w-64"
            />
            <Button
              @click="copyIP"
              variant="secondary"
              size="sm"
              class="hover:bg-white hover:text-black"
            >
              <Copy class="mr-2 h-4 w-4" />
              {{ copy.home.copyIp }}
            </Button>
          </div>
        </div>

        <PlayerCounter class="mb-10 justify-center" />

        <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            @click="showJoinGuide = true; siteAnalytics.track('join_guide_open')"
            size="lg"
            class="w-full bg-orange-600 px-8 text-lg font-bold hover:bg-orange-700 sm:w-auto animate-pulse hover:animate-none"
          >
            <Gamepad2 class="mr-2 h-6 w-6" />
            {{ copy.home.playNow }}
          </Button>
          <Button
            @click="joinDiscord"
            size="lg"
            variant="outline"
            class="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto backdrop-blur-sm"
          >
            <Mic class="mr-2 h-6 w-6" />
            {{ copy.home.joinDiscord }}
          </Button>
        </div>
      </div>
    </section>

    <section aria-labelledby="shop-promo-title" class="flex flex-col gap-6 rounded-2xl border border-emerald-300/30 bg-gradient-to-r from-zinc-900 to-emerald-950/30 p-6 md:flex-row md:items-center md:justify-between md:p-8">
      <div class="max-w-2xl">
        <p class="text-sm font-bold uppercase tracking-wider text-emerald-300">{{ locale.code === "fr" ? "Boutique · un effet offert à tous" : "Shop · a free effect for everyone" }}</p>
        <h2 id="shop-promo-title" class="mt-2 text-2xl font-black text-white">{{ locale.code === "fr" ? "Fais briller ton passage avec Étincelles de cookie" : "Leave a little glow with Cookie Sparkles" }}</h2>
        <p class="mt-3 text-zinc-400">{{ locale.code === "fr" ? "Découvre ton effet gratuit pour le lobby et les cosmétiques facultatifs. Aucun achat nécessaire pour jouer ou activer les étincelles." : "Discover your free lobby effect and optional cosmetics. No purchase needed to play or equip your sparkles." }}</p>
      </div>
      <NuxtLink :to="localizePath('/shop')" @click="shopAnalytics.track('free_effect_click', { source: 'home' }); siteAnalytics.track('shop_entry')" class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-emerald-300 px-5 py-3 font-black text-zinc-950 hover:bg-emerald-200">{{ locale.code === "fr" ? "Découvrir la boutique" : "Explore the shop" }}</NuxtLink>
    </section>

    <Teleport to="body">
      <div
        v-if="showJoinGuide"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-title"
        @click.self="showJoinGuide = false"
      >
        <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-6 text-left shadow-2xl md:p-8">
          <div class="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 id="join-title" class="text-2xl font-black text-white">{{ copy.home.joinTitle }}</h2>
              <p class="mt-1 text-sm text-zinc-400">{{ copy.home.joinIntro }}</p>
            </div>
            <button
              type="button"
              class="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              :aria-label="copy.home.closeGuide"
              @click="showJoinGuide = false"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <div class="mb-6 grid grid-cols-3 gap-2" role="tablist" :aria-label="copy.home.editionLabel">
            <button
              v-for="edition in editions"
              :key="edition.id"
              type="button"
              role="tab"
              :aria-selected="selectedEdition === edition.id"
              class="rounded-xl border px-3 py-3 text-sm font-bold transition-colors"
              :class="selectedEdition === edition.id ? 'border-orange-400 bg-orange-500 text-white' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600'"
              @click="selectedEdition = edition.id"
            >
              {{ edition.label }}
            </button>
          </div>

          <div v-if="selectedEdition === 'java'" class="space-y-5 text-zinc-300">
            <ol class="list-decimal space-y-2 pl-5">
              <li v-for="step in copy.home.javaSteps" :key="step">{{ step }}</li>
            </ol>
            <JoinAddress :address="serverIP" :label="copy.common.serverAddress" @copy="copyText(serverIP, copy.common.serverAddress)" />
          </div>

          <div v-else-if="selectedEdition === 'bedrock'" class="space-y-5 text-zinc-300">
            <ol class="list-decimal space-y-2 pl-5">
              <li v-for="step in copy.home.bedrockSteps" :key="step">{{ step }}</li>
            </ol>
            <div class="grid gap-3 sm:grid-cols-2">
              <JoinAddress :address="serverIP" :label="copy.common.serverAddress" @copy="copyText(serverIP, copy.common.serverAddress)" />
              <JoinAddress :address="bedrockPort" :label="copy.common.bedrockPort" @copy="copyText(bedrockPort, copy.common.bedrockPort)" />
            </div>
            <Button class="w-full bg-green-600 font-bold hover:bg-green-700" @click="openBedrockLink">
              <Gamepad2 class="mr-2 h-5 w-5" />
              {{ copy.home.addBedrock }}
            </Button>
            <p class="text-xs text-zinc-500">{{ copy.home.bedrockFallback }}</p>
          </div>

          <div v-else class="space-y-5 text-zinc-300">
            <p>{{ copy.home.consoleText }}</p>
            <a
              href="https://geysermc.org/wiki/geyser/using-geyser-with-consoles/"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
            >
              {{ copy.home.consoleGuide }}
              <ExternalLink class="ml-2 h-4 w-4" />
            </a>
            <p class="text-sm text-zinc-500">{{ copy.home.consoleNotice }}</p>
          </div>
        </div>
      </div>
    </Teleport>

    <section id="mobile-app" class="scroll-mt-24 overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-950/30 p-8 shadow-xl md:p-12">
      <div class="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <Badge class="mb-4 bg-orange-600 hover:bg-orange-600">{{ copy.home.mobileBadge }}</Badge>
          <h2 class="text-3xl font-black tracking-tight text-white md:text-4xl">{{ copy.home.mobileTitle }}</h2>
          <p class="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-300">
            {{ copy.home.mobileBody }}
          </p>
          <div class="mt-7">
            <AppStoreButtons />
          </div>
        </div>
        <div class="rounded-2xl border border-zinc-800 bg-black/30 p-6">
          <h3 class="text-xl font-bold text-white">{{ copy.home.actionTitle }}</h3>
          <p class="mt-3 text-zinc-400">
            {{ copy.home.actionBody }}
          </p>
          <Button as-child variant="outline" class="mt-6 border-orange-500/40 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20">
            <NuxtLink to="/updates">{{ copy.home.allUpdates }}</NuxtLink>
          </Button>
        </div>
      </div>
    </section>

    <section v-if="latestUpdates.length && locale.code === 'en'" aria-labelledby="latest-updates-title" lang="en-AU">
      <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge class="mb-3 bg-orange-600 hover:bg-orange-600">Fresh from the network</Badge>
          <h2 id="latest-updates-title" class="text-3xl font-black tracking-tight text-white md:text-4xl">Latest updates</h2>
          <p class="mt-3 max-w-2xl text-zinc-400">News and player-facing changes, shared with the Cookie Build app.</p>
        </div>
        <NuxtLink to="/updates" class="inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">
          View all updates
        </NuxtLink>
      </div>
      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <UpdatePostCard v-for="post in latestUpdates" :key="post.id" :post="post" compact />
      </div>
    </section>

    <!-- Legacy / History Section -->
    <section class="text-center">
      <div class="mx-auto max-w-4xl border-t border-zinc-800 pt-16 mt-10">
        <h2 class="mb-6 text-2xl font-bold text-white">
          {{ copy.home.history }}
        </h2>
        <p class="mb-8 text-lg text-zinc-400 leading-relaxed">
          {{ copy.home.historyBody }}
        </p>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="rounded-xl bg-zinc-900 p-4 border border-zinc-800">
            <div class="text-zinc-500 text-[10px] font-bold uppercase mb-1">{{ copy.home.launched }}</div>
            <div class="text-xl font-bold text-white">2014</div>
          </div>
          <div class="rounded-xl bg-zinc-900 p-4 border border-zinc-800">
            <div class="text-zinc-500 text-[10px] font-bold uppercase mb-1">{{ copy.home.peakScale }}</div>
            <div class="text-xl font-bold text-white">2,000+ {{ copy.home.players }}</div>
          </div>
          <div class="rounded-xl bg-zinc-900 p-4 border border-zinc-800">
            <div class="text-zinc-500 text-[10px] font-bold uppercase mb-1">{{ copy.home.projectStatus }}</div>
            <div class="text-xl font-bold text-white">{{ copy.home.active }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section>
      <div class="grid gap-8 md:grid-cols-3">
        <Card
          v-for="feature in features"
          :key="feature.title"
          class="border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <CardHeader>
            <CardTitle class="flex items-center gap-3 text-xl">
              <div class="rounded-lg bg-secondary p-2">
                <img
                  :src="feature.icon"
                  :alt="feature.title"
                  class="h-6 w-6"
                />
              </div>
              {{ feature.title }}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-muted-foreground">{{ feature.description }}</p>
          </CardContent>
        </Card>
      </div>
    </section>

    <!-- Minigames Grid -->
    <section>
      <h2 class="mb-10 text-center text-3xl font-bold tracking-tight md:text-4xl text-foreground">
        {{ copy.home.minigamesTitle }}
      </h2>
      <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
        <Card
          v-for="game in minigames"
          :key="game.name"
          class="group relative overflow-hidden border-border bg-card transition-all duration-300 hover:border-orange-500/50 hover:shadow-2xl"
        >
          <div
            v-if="game.new"
            class="absolute right-0 top-0 rounded-bl-xl bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-sm"
          >
            {{ game.cornerLabel ?? copy.common.beta }}
          </div>
          <CardHeader>
            <CardTitle class="flex items-center gap-3 text-2xl">
              <img :src="game.icon" :alt="game.name" class="h-8 w-8 transition-transform group-hover:scale-110" />
              {{ game.name }}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p class="mb-4 text-muted-foreground">{{ game.description }}</p>
            <Badge
              :variant="game.available ? 'default' : 'secondary'"
              :class="game.available ? 'bg-green-600 hover:bg-green-700' : ''"
            >
              {{ game.statusLabel ?? (game.available ? copy.common.available : copy.common.comingSoon) }}
            </Badge>
            <NuxtLink
              v-if="game.href"
              :to="game.href"
              class="ml-4 inline-flex min-h-11 items-center text-sm font-bold text-orange-400 hover:text-orange-300"
            >
              {{ copy.home.gameLink(game.name) }}
            </NuxtLink>
          </CardContent>
        </Card>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="mx-auto max-w-4xl">
      <h2 class="mb-10 text-center text-3xl font-bold tracking-tight md:text-4xl text-foreground">
        {{ copy.home.faqTitle }}
      </h2>
      <div class="grid gap-6 md:grid-cols-2">
        <div v-for="(faq, index) in faqs" :key="index" class="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 class="mb-3 text-lg font-bold text-foreground">{{ faq.question }}</h3>
          <p class="text-muted-foreground">{{ faq.answer }}</p>
        </div>
      </div>
    </section>

    <!-- About Section -->
    <section class="rounded-3xl bg-secondary/30 p-8 md:p-12">
      <div class="flex flex-col items-center gap-8 md:flex-row">
        <div class="flex-1">
            <h2 class="mb-6 text-3xl font-bold tracking-tight text-foreground">{{ copy.home.aboutTitle }}</h2>
            <div class="space-y-4 text-muted-foreground">
                <p v-for="paragraph in copy.home.aboutBody" :key="paragraph">{{ paragraph }}</p>
            </div>
            <div class="mt-8 flex gap-4">
                <a href="https://x.com/CookieBuild" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-600">
                    {{ copy.home.followX }}
                </a>
                <a href="https://github.com/Guillaume351" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                    {{ copy.home.viewGithub }}
                </a>
            </div>
        </div>
        <div class="flex-1 text-center md:text-right">
            <!-- Placeholder for an image or graphic if needed -->
            <img src="/android-chrome-192x192.png" alt="Cookie Build" class="inline-block h-32 w-32 opacity-20 grayscale md:h-48 md:w-48" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import PlayerCounter from "@/components/PlayerCounter.vue";
import JoinAddress from "@/components/JoinAddress.vue";
import UpdatePostCard from "@/components/UpdatePostCard.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, ExternalLink, Gamepad2, Mic, X } from "@lucide/vue";
import { onMounted, ref, watch } from "vue";

definePageMeta({ alias: ["/fr", "/de", "/it", "/bg", "/es", "/hi", "/pt-br"] });

const serverIP = ref("play.cookie-build.com");
const bedrockPort = "19132";
const showJoinGuide = ref(false);
const selectedEdition = ref("java");
const shopAnalytics = useShopAnalytics();
const siteAnalytics = useSiteAnalytics();
const { locale, copy, localizePath } = useSiteLocale();
const editions = computed(() => [
  { id: "java", label: "Java" },
  { id: "bedrock", label: "Bedrock" },
  { id: "console", label: copy.value.home.consoleEdition },
]);

const { canonicalUrl } = useLocalizedSeo(
  "/",
  computed(() => copy.value.home.title),
  computed(() => copy.value.home.description),
);

onMounted(() => {
  const remembered = window.localStorage.getItem("cookiebuild-minecraft-edition");
  if (remembered === "java" || remembered === "bedrock" || remembered === "console") {
    selectedEdition.value = remembered;
    return;
  }
  if (window.matchMedia("(max-width: 767px)").matches) {
    selectedEdition.value = "bedrock";
  }
});

watch(selectedEdition, (edition) => {
  if (import.meta.client) {
    window.localStorage.setItem("cookiebuild-minecraft-edition", edition);
  }
});

const { data: updatesData } = await useFetch("/api/mobile/v1/news", {
  query: { limit: 3 },
});
const latestUpdates = computed(() => updatesData.value?.data ?? []);
const { data: bootstrapData } = await useFetch("/api/mobile/v1/bootstrap");
const bedWarsAvailable = computed(() => bootstrapData.value?.data?.gamemodes
  ?.some((game) => game.id === "bedwars" && game.available) ?? false);

const featureIcons = ["/unique-games-icon.svg", "/community-icon.svg", "/java-support-icon.svg"];
const features = computed(() => copy.value.home.features.map((feature, index) => ({
  ...feature,
  icon: featureIcons[index],
})));
const minigames = computed(() => [
  {
    name: "MicroBattles",
    description: copy.value.home.games.microbattles.description,
    available: true,
    icon: "/microbattles-icon.svg",
    href: localizePath("/microbattles"),
  },
  {
    name: "Pitchout",
    description: copy.value.home.games.pitchout.description,
    available: true,
    icon: "/pitchout-icon.svg",
    href: localizePath("/pitchout"),
  },
  {
    name: "Build Battles",
    description: copy.value.home.games["build-battle"].description,
    available: true,
    icon: "/buildbattle-icon.svg",
    href: localizePath("/build-battle"),
  },
  {
    name: "SkyWars",
    description: copy.value.home.games.skywars.description,
    available: true,
    icon: "/skywars-icon.svg",
    href: localizePath("/skywars"),
  },
  {
    name: "TurfWars",
    description: copy.value.home.games.turfwars.description,
    available: true,
    icon: "/turfwars-icon.svg",
    new: true,
    href: localizePath("/turfwars"),
  },
  {
    name: "BedWars",
    description: copy.value.home.games.bedwars.description,
    available: bedWarsAvailable.value,
    statusLabel: bedWarsAvailable.value ? copy.value.home.games.bedwars.status : copy.value.common.comingSoon,
    icon: "/bedwars-icon.svg",
    new: true,
    cornerLabel: copy.value.common.beta,
    href: localizePath("/bedwars"),
  },
  {
    name: "Skyblock",
    description: copy.value.home.games.skyblock.description,
    available: true,
    statusLabel: copy.value.home.games.skyblock.status,
    icon: "/skyblock-icon.svg",
    new: true,
    cornerLabel: copy.value.common.beta,
    href: localizePath("/skyblock"),
  },
]);

const faqs = computed(() => copy.value.home.faqs);

const copyIP = () => {
  copyText(serverIP.value, copy.value.common.serverAddress);
};

const copyText = async (value, label) => {
  await navigator.clipboard.writeText(value);
  if (value === serverIP.value) siteAnalytics.track("server_address_copy");
  alert(`${label} ${copy.value.common.copied}!`);
};

const openBedrockLink = () => {
  siteAnalytics.track("bedrock_server_add");
  window.location.href = `minecraft://?addExternalServer=CookieBuild|${serverIP.value}:${bedrockPort}`;
};

const joinDiscord = () => {
  siteAnalytics.track("discord_open");
  window.open("https://discord.gg/ajmPnwh9g8", "_blank", "noopener,noreferrer");
};

useHead(() => ({
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify([
        {
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: "Cookie Build",
          description: copy.value.home.description,
          inLanguage: locale.value.htmlLang,
          genre: ["Multiplayer", "Mini-games", "Action"],
          gamePlatform: ["PC", "Mobile", "Console"],
          applicationCategory: "Game",
          operatingSystem: "Windows, macOS, Linux, iOS, Android, Xbox, PlayStation, Switch",
          url: canonicalUrl.value,
          image: "https://www.cookie-build.com/lobby-hero-clean-1600.webp",
          author: {
            "@type": "Person",
            name: "Guillaume351",
            url: "https://github.com/Guillaume351",
          },
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            category: "Free",
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          inLanguage: locale.value.htmlLang,
          mainEntity: faqs.value.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
            },
          })),
        },
      ]),
    },
  ],
}));
</script>

<style scoped>
.hero-lobby {
  background-image: url("/lobby-hero-clean-960.webp");
}

@media (min-width: 768px) {
  .hero-lobby {
    background-image: url("/lobby-hero-clean-1600.webp");
  }
}
</style>
