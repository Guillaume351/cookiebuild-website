<template>
  <div class="homepage">
    <div class="hero">
      <div class="hero-content">
        <h1 class="text-5xl md:text-6xl font-bold text-white mb-4">
          Cookie Build
        </h1>
        <p class="tagline text-xl md:text-2xl text-white mb-8">
          The Classic Minecraft Mini-Games Experience
        </p>
        <div class="server-info mb-8">
          <Input v-model="serverIP" readonly class="w-64 md:w-72" />
          <Button @click="copyIP" variant="secondary">
            <Copy class="mr-2 h-4 w-4" />
            Copy IP
          </Button>
        </div>
        <div
          class="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4"
        >
          <Button @click="playNow" size="lg" class="w-full sm:w-auto">
            <Gamepad2 class="mr-2 h-5 w-5" />
            Play Now
          </Button>
          <Button
            @click="joinDiscord"
            size="lg"
            variant="outline"
            class="w-full sm:w-auto"
          >
            <Mic class="mr-2 h-5 w-5" />
            Join Discord
          </Button>
        </div>
      </div>
    </div>
    <div class="features">
      <Card
        v-for="feature in features"
        :key="feature.title"
        class="w-full sm:w-[calc(33.333%-1rem)] mb-6"
      >
        <CardHeader>
          <CardTitle class="flex items-center">
            <img
              :src="feature.icon"
              :alt="feature.title"
              class="w-8 h-8 mr-3"
            />
            {{ feature.title }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{{ feature.description }}</p>
        </CardContent>
      </Card>
    </div>
    <div class="minigames">
      <h2 class="text-3xl font-bold text-center mb-8">Our Minigames</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          v-for="game in minigames"
          :key="game.name"
          class="flex flex-col hover:shadow-lg transition-shadow duration-300"
        >
          <CardHeader>
            <CardTitle class="flex items-center">
              <img :src="game.icon" :alt="game.name" class="w-8 h-8 mr-3" />
              {{ game.name }}
            </CardTitle>
          </CardHeader>
          <CardContent class="flex-grow">
            <p>{{ game.description }}</p>
          </CardContent>
          <CardFooter class="flex justify-between items-center">
            <Badge
              :variant="game.available ? 'default' : 'secondary'"
              class="text-sm"
            >
              {{ game.available ? "Available Now" : "Coming Soon" }}
            </Badge>
          </CardFooter>
        </Card>
      </div>
    </div>
    <div class="about">
      <h2 class="text-3xl font-bold text-center mb-8">About Cookie Build</h2>
      <Card class="mb-6">
        <CardHeader>
          <CardTitle>Our Story</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="mb-4">
            Cookie Build has been serving the Minecraft community for over 9
            years. Originally launched as a Bedrock-only server, we're expanding
            to support both Bedrock and Java editions in the latest remake of
            the server, providing a classic mini-games experience to players
            worldwide.
          </p>
          <p class="mb-4">
            Follow us on Twitter:
            <a
              href="https://twitter.com/CookieBuild"
              target="_blank"
              class="text-blue-500 hover:underline"
              >@CookieBuild</a
            >
          </p>
          <p>
            Server Owner & Developer:
            <a
              href="https://github.com/Guillaume351"
              target="_blank"
              class="text-blue-500 hover:underline"
              >Guillaume351</a
            >
          </p>
        </CardContent>
      </Card>
    </div>
    <div class="text-center">
      <Button @click="contactSupport" variant="outline" class="mt-8">
        <Mail class="mr-2 h-4 w-4" />
        Contact Support
      </Button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Copy, Gamepad2, Mic, Mail } from "lucide-vue-next";

const serverIP = ref("play.cookie-build.com");

const features = [
  {
    title: "Unique Games",
    icon: "/unique-games-icon.svg",
    description:
      "Experience a variety of homemade mini-games found nowhere else.",
  },
  {
    title: "Vibrant Community",
    icon: "/community-icon.svg",
    description:
      "Join a friendly and active player base from around the world.",
  },
  {
    title: "Java Support",
    icon: "/java-support-icon.svg",
    description:
      "In addition to the Bedrock support, Cookie Build is now fully compatible with Minecraft Java Edition for the best experience.",
  },
];
const minigames = [
  {
    name: "MicroBattles",
    description:
      "Fast-paced mini-game where players compete in quick, intense battles.",
    available: true,
    icon: "/microbattles-icon.svg",
  },
  {
    name: "Build Battle",
    description:
      "Show off your creativity by building amazing structures in a limited time.",
    available: false,
    icon: "/buildbattle-icon.svg",
  },
  {
    name: "SkyWars",
    description: "Battle other players on floating islands in the sky.",
    available: false,
    icon: "/skywars-icon.svg",
  },
  {
    name: "TurfWars",
    description:
      "Capture territory and defend it from other teams in this exciting game mode.",
    available: false,
    icon: "/turfwars-icon.svg",
  },
];

const copyIP = () => {
  navigator.clipboard.writeText(serverIP.value);
  // You might want to use a toast notification here instead of an alert
  alert("IP address copied to clipboard!");
};

const playNow = () => {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  if (isMobile) {
    // Launch Minecraft Bedrock on mobile
    window.location.href = "minecraft://";
  } else {
    // Launch Minecraft Java on PC
    // This is a pseudo-protocol that might work on some systems
    window.location.href = "minecraft:";
  }
};

const joinDiscord = () => {
  // Replace with your actual Discord invite link
  window.open("https://discord.gg/ajmPnwh9g8", "_blank");
};

const contactSupport = () => {
  window.location.href = "mailto:support@cookie-build.com";
};
</script>

<style scoped>
.homepage {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.hero {
  text-align: center;
  padding: 80px 20px;
  background: url("/lobby.webp") center/cover no-repeat;
  border-radius: 20px;
  margin-bottom: 60px;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
  z-index: 1;
}

.hero-content {
  position: relative;
  z-index: 2;
}

.server-info {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.features {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 60px;
}

.minigames {
  margin-bottom: 60px;
}

@media (max-width: 640px) {
  .features,
  .minigames > div {
    flex-direction: column;
  }
}
</style>
