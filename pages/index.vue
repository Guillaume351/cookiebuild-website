<template>
  <div class="space-y-20">
    <!-- Hero Section -->
    <section
      class="relative overflow-hidden rounded-3xl bg-gray-900 text-center text-white shadow-2xl"
    >
      <div
        class="absolute inset-0 z-0 bg-[url('/lobby.webp')] bg-cover bg-center opacity-50 transition-transform duration-1000 hover:scale-105"
      ></div>
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
          The Classic Minecraft Mini-Games Experience. <br />
          <span class="text-orange-400">Java</span> &
          <span class="text-green-400">Bedrock</span> Editions Supported.
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
              Copy
            </Button>
          </div>
        </div>

        <PlayerCounter class="mb-10 justify-center" />

        <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            @click="playNow"
            size="lg"
            class="w-full bg-orange-600 px-8 text-lg font-bold hover:bg-orange-700 sm:w-auto animate-pulse hover:animate-none"
          >
            <Gamepad2 class="mr-2 h-6 w-6" />
            Play Now
          </Button>
          <Button
            @click="joinDiscord"
            size="lg"
            variant="outline"
            class="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto backdrop-blur-sm"
          >
            <Mic class="mr-2 h-6 w-6" />
            Join Discord
          </Button>
        </div>
      </div>
    </section>

    <!-- Legacy / History Section -->
    <section class="text-center">
      <div class="mx-auto max-w-4xl border-t border-zinc-800 pt-16 mt-10">
        <h2 class="mb-6 text-2xl font-bold text-white">
          History
        </h2>
        <p class="mb-8 text-lg text-zinc-400 leading-relaxed">
          Cookie Build started in 2014 as a small project. Over the years, it developed into a mini-games server for the Minecraft PE community. Today, the project is still maintained and has been updated to support both Java and Bedrock editions.
        </p>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="rounded-xl bg-zinc-900 p-4 border border-zinc-800">
            <div class="text-zinc-500 text-[10px] font-bold uppercase mb-1">Launched</div>
            <div class="text-xl font-bold text-white">2014</div>
          </div>
          <div class="rounded-xl bg-zinc-900 p-4 border border-zinc-800">
            <div class="text-zinc-500 text-[10px] font-bold uppercase mb-1">Peak Scale</div>
            <div class="text-xl font-bold text-white">2,000+ Players</div>
          </div>
          <div class="rounded-xl bg-zinc-900 p-4 border border-zinc-800">
            <div class="text-zinc-500 text-[10px] font-bold uppercase mb-1">Project Status</div>
            <div class="text-xl font-bold text-white">Active</div>
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
        Our Minigames
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
            NEW
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
              {{ game.available ? "Available Now" : "Coming Soon" }}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="mx-auto max-w-4xl">
      <h2 class="mb-10 text-center text-3xl font-bold tracking-tight md:text-4xl text-foreground">
        Frequently Asked Questions
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
            <h2 class="mb-6 text-3xl font-bold tracking-tight text-foreground">About the Project</h2>
            <div class="space-y-4 text-muted-foreground">
                <p>
                    Cookie Build is a passion project maintained by <strong>Guillaume351</strong>.
                    It aims to preserve the spirit of classic Minecraft mini-games while leveraging modern technology.
                </p>
                <p>
                    Whether you are playing on a phone, tablet, console, or PC, everyone plays together on the same server.
                </p>
            </div>
            <div class="mt-8 flex gap-4">
                <a href="https://twitter.com/CookieBuild" target="_blank" class="flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-600">
                    Follow on Twitter
                </a>
                <a href="https://github.com/Guillaume351" target="_blank" class="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                    View on GitHub
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
import Badge from "@/components/ui/badge/Badge.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Gamepad2, Mic } from "@lucide/vue";
import { ref } from "vue";

const serverIP = ref("play.cookie-build.com");

const features = [
  {
    title: "Unique Games",
    icon: "/unique-games-icon.svg",
    description:
      "Experience a variety of homemade mini-games found nowhere else, built from scratch.",
  },
  {
    title: "Global Community",
    icon: "/community-icon.svg",
    description:
      "Join a friendly and active player base from around the world. Discord is our home.",
  },
  {
    title: "Cross-Platform",
    icon: "/java-support-icon.svg",
    description:
      "Full support for both Java & Bedrock Editions. Play with your friends on any device.",
  },
];
const minigames = [
  {
    name: "MicroBattles",
    description:
      "Fast-paced 4-team battles. Gather resources, build defenses, and be the last team standing.",
    available: true,
    icon: "/microbattles-icon.svg",
  },
  {
    name: "Pitchout",
    description:
      "A chaotic sumo-style game. Knock opponents into the void 5 times to eliminate them. Power-ups included!",
    available: true,
    icon: "/pitchout-icon.svg",
    new: true,
  },
  {
    name: "Build Battle",
    description:
      "Show off your creativity. Build amazing structures based on a theme in a limited time.",
    available: false,
    icon: "/buildbattle-icon.svg",
  },
  {
    name: "SkyWars",
    description: "Battle other players on floating islands. Loot chests, bridge to mid, and survive.",
    available: false,
    icon: "/skywars-icon.svg",
  },
  {
    name: "TurfWars",
    description:
      "Capture territory by shooting opponents. The team with the most turf wins.",
    available: false,
    icon: "/turfwars-icon.svg",
  },
];

const faqs = [
  {
    question: "Can I join from Minecraft Bedrock Edition?",
    answer: "Yes! Cookie Build is fully compatible with Bedrock Edition (PE, Xbox, PlayStation, Switch). Use the IP play.cookie-build.com and port 19132.",
  },
  {
    question: "Is the server free to play?",
    answer: "Absolutely. All our mini-games are free to play for everyone. We focus on a classic, fair experience for all players.",
  },
  {
    question: "How do I play on Java Edition?",
    answer: "Open Minecraft Java Edition, go to Multiplayer > Add Server, and enter play.cookie-build.com. We support version 1.8 up to the latest!",
  },
  {
    question: "Is there a Discord community?",
    answer: "Yes, we have a very active Discord where you can find teammates, report bugs, and suggest new features. Click the 'Join Discord' button above!",
  },
  {
    question: "What is the history of Cookie Build?",
    answer: "It is a long-standing project that started in 2014. At its peak, it supported over 2,000 players at once. We have maintained and updated the project consistently over the years.",
  },
  {
    question: "Are there any rank systems?",
    answer: "We have a global leaderboard and seasonal stats. You can track your progress on our Player Stats page!",
  },
];

const copyIP = () => {
  navigator.clipboard.writeText(serverIP.value);
  alert("IP address copied to clipboard!");
};

const playNow = () => {
  window.location.href =
    "minecraft:?addExternalServer=CookieBuild|play.cookie-build.com";
};

const joinDiscord = () => {
  window.open("https://discord.gg/ajmPnwh9g8", "_blank");
};

useHead({
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify([
        {
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: "Cookie Build",
          description:
            "Cookie Build is a Minecraft Mini-Games Server supporting both Java and Bedrock Editions. Featuring original games like Pitchout and MicroBattles.",
          genre: ["Multiplayer", "Mini-games", "Action"],
          gamePlatform: ["PC", "Mobile", "Console"],
          applicationCategory: "Game",
          operatingSystem: "Windows, macOS, Linux, iOS, Android, Xbox, PlayStation, Switch",
          url: "https://cookie-build.com",
          image: "https://cookie-build.com/lobby.webp",
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
          mainEntity: faqs.map((f) => ({
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
});
</script>
