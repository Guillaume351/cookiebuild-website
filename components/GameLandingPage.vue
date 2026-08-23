<template>
  <div class="space-y-16">
    <section class="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-zinc-950 text-white shadow-2xl">
      <img
        v-if="game.heroImage"
        :src="game.heroImage"
        alt=""
        aria-hidden="true"
        class="absolute inset-0 h-full w-full object-cover object-center opacity-35"
      />
      <div v-else class="hero-lobby absolute inset-0 bg-cover bg-center opacity-30"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-orange-950/60"></div>

      <div class="relative px-6 py-16 md:px-12 md:py-24">
        <NuxtLink :to="localizePath('/games')" class="mb-8 inline-flex text-sm font-bold text-orange-300 hover:text-orange-200">
          {{ copy.gameUi.allGames }}
        </NuxtLink>
        <div class="max-w-4xl">
          <div class="mb-5 flex items-center gap-3">
            <img :src="game.icon" :alt="game.name" class="h-11 w-11" />
            <Badge class="bg-green-600 hover:bg-green-600">{{ game.badgeLabel || copy.gameUi.available }}</Badge>
          </div>
          <h1 class="text-4xl font-black tracking-tight text-white md:text-6xl">{{ game.h1 }}</h1>
          <p class="mt-6 max-w-3xl text-lg leading-relaxed text-zinc-200 md:text-xl">{{ game.heroIntro }}</p>

          <p class="mt-5 font-mono text-sm font-bold text-white md:text-base">
            {{ copy.gameUi.bedrockIp }}: {{ serverIP }} · {{ copy.gameUi.bedrockPort }}: {{ bedrockPort }} · {{ copy.gameUi.javaIp }}: {{ serverIP }}
          </p>

          <div class="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button size="lg" class="bg-green-600 px-7 text-base font-bold hover:bg-green-700" @click="openBedrockLink">
              <Gamepad2 class="mr-2 h-5 w-5" />
              {{ copy.gameUi.addBedrock }}
            </Button>
            <Button size="lg" variant="outline" class="border-white/20 bg-white/10 px-7 text-base font-bold text-white hover:bg-white/20" @click="copyServerAddress">
              <Copy class="mr-2 h-5 w-5" />
              {{ copiedLabel || copy.gameUi.copyIp }}
            </Button>
          </div>

          <PlayerCounter class="mt-8 w-fit" />
        </div>
      </div>
    </section>

    <figure v-if="game.heroImage" class="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
      <img
        :src="game.heroImage"
        :alt="game.heroImageAlt || `${game.name} Minecraft map`"
        :width="game.heroImageWidth"
        :height="game.heroImageHeight"
        class="aspect-video h-auto w-full object-cover"
      />
      <figcaption class="border-t border-zinc-800 px-5 py-3 text-sm text-zinc-400">
        {{ game.heroImageCaption || game.heroImageAlt }}
      </figcaption>
    </figure>

    <section :aria-labelledby="`${game.slug}-join-title`" class="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p class="text-sm font-black uppercase tracking-widest text-orange-400">{{ copy.gameUi.serverAddress }}</p>
        <h2 :id="`${game.slug}-join-title`" class="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
          {{ game.joinHeading }}
        </h2>
        <p class="mt-5 text-lg leading-relaxed text-zinc-400">{{ game.joinIntro }}</p>
      </div>

      <div class="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl md:p-8">
        <div class="grid gap-4 sm:grid-cols-2">
          <JoinAddress :address="serverIP" :label="copy.gameUi.connectionAddress" @copy="copyText(serverIP, copy.gameUi.serverAddress)" />
          <JoinAddress :address="bedrockPort" :label="copy.gameUi.bedrockPort" @copy="copyText(bedrockPort, copy.gameUi.bedrockPort)" />
        </div>
        <ol class="mt-7 list-decimal space-y-3 pl-5 text-zinc-300">
          <li v-for="step in copy.gameUi.steps" :key="step">{{ step }}</li>
        </ol>
        <p class="mt-5 text-sm text-zinc-500">
          {{ copy.gameUi.consoleNotice }}
        </p>
      </div>
    </section>

    <section :aria-labelledby="`${game.slug}-gameplay-title`">
      <div class="mx-auto max-w-3xl text-center">
        <p class="text-sm font-black uppercase tracking-widest text-orange-400">{{ game.gameplayEyebrow }}</p>
        <h2 :id="`${game.slug}-gameplay-title`" class="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
          {{ game.gameplayHeading }}
        </h2>
      </div>

      <div class="mt-10 grid gap-6 md:grid-cols-3">
        <article v-for="(step, index) in game.steps" :key="step.title" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-7">
          <div class="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-orange-600 text-lg font-black text-white">
            {{ index + 1 }}
          </div>
          <h3 class="text-xl font-bold text-white">{{ step.title }}</h3>
          <p class="mt-3 leading-relaxed text-zinc-400">{{ step.description }}</p>
        </article>
      </div>
    </section>

    <section class="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-950/40 via-zinc-950 to-zinc-950 p-8 md:p-12">
      <div class="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
        <div>
          <h2 class="text-3xl font-black tracking-tight text-white">{{ game.highlightHeading }}</h2>
          <p class="mt-4 max-w-3xl text-lg leading-relaxed text-zinc-300">{{ game.highlightBody }}</p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Button class="bg-orange-600 font-bold hover:bg-orange-700" @click="copyServerAddress">
            <Copy class="mr-2 h-4 w-4" />
            {{ serverIP }}
          </Button>
          <Button as-child variant="outline" class="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">
            <NuxtLink to="/player-stats">{{ copy.gameUi.stats }}</NuxtLink>
          </Button>
        </div>
      </div>
    </section>

    <section :aria-labelledby="`${game.slug}-faq-title`" class="mx-auto max-w-4xl">
      <h2 :id="`${game.slug}-faq-title`" class="text-center text-3xl font-black tracking-tight text-white md:text-4xl">
        {{ copy.gameUi.faqTitle(game.name) }}
      </h2>
      <div class="mt-9 space-y-4">
        <details v-for="faq in game.faqs" :key="faq.question" class="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <summary class="cursor-pointer list-none pr-6 text-lg font-bold text-white">{{ faq.question }}</summary>
          <p class="mt-3 leading-relaxed text-zinc-400">{{ faq.answer }}</p>
        </details>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import Badge from "@/components/ui/badge/Badge.vue";
import { Button } from "@/components/ui/button";
import type { GameLanding } from "@/utils/game-landings";
import { COOKIE_BUILD_BEDROCK_PORT, COOKIE_BUILD_SERVER_IP } from "@/utils/game-landings";
import { Copy, Gamepad2 } from "@lucide/vue";

defineProps<{ game: GameLanding }>();

const serverIP = COOKIE_BUILD_SERVER_IP;
const bedrockPort = COOKIE_BUILD_BEDROCK_PORT;
const copiedLabel = ref("");
const { copy, localizePath } = useSiteLocale();

const copyText = async (value: string, label: string) => {
  await navigator.clipboard.writeText(value);
  copiedLabel.value = `${label} ${copy.value.common.copied}`;
  window.setTimeout(() => {
    copiedLabel.value = "";
  }, 2000);
};

const copyServerAddress = () => copyText(serverIP, copy.value.gameUi.serverAddress);

const openBedrockLink = () => {
  window.location.href = `minecraft://?addExternalServer=CookieBuild|${serverIP}:${bedrockPort}`;
};
</script>

<style scoped>
.hero-lobby {
  background-image: url("/lobby-hero-960.webp");
}

@media (min-width: 768px) {
  .hero-lobby {
    background-image: url("/lobby-hero-1600.webp");
  }
}
</style>
