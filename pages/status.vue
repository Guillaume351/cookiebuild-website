<template>
  <main class="mx-auto max-w-5xl space-y-10 py-12 text-zinc-300">
    <header class="space-y-4">
      <Badge class="bg-orange-600 hover:bg-orange-600">{{ copy.badge }}</Badge>
      <h1 class="text-4xl font-black tracking-tight text-white md:text-5xl">{{ copy.title }}</h1>
      <p class="max-w-3xl text-lg text-zinc-400">
        {{ copy.intro }}
      </p>
    </header>


    <section
      class="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl md:p-8"
      aria-labelledby="current-status"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="current-status" class="text-2xl font-black text-white">{{ copy.currentStatus }}</h2>
          <p class="mt-1 text-sm text-zinc-500" aria-live="polite">
            {{ checkedAtLabel }}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          class="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
          :disabled="pending"
          @click="refresh()"
        >
          <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': pending }" />
          {{ copy.refresh }}
        </Button>
      </div>

      <div v-if="status" class="mt-8 grid gap-5 md:grid-cols-2">
        <article
          v-for="edition in editions"
          :key="edition.id"
          class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <div class="flex items-center justify-between gap-4">
            <h3 class="text-2xl font-bold text-white">{{ edition.name }}</h3>
            <span
              class="rounded-full px-3 py-1 text-sm font-bold"
              :class="statusTone(edition.status)"
            >
              {{ statusLabel(edition.status) }}
            </span>
          </div>
          <dl class="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt class="text-zinc-500">{{ copy.playersReported }}</dt>
              <dd class="mt-1 text-xl font-black text-white">{{ edition.status.players }}</dd>
            </div>
            <div>
              <dt class="text-zinc-500">{{ copy.version }}</dt>
              <dd class="mt-1 font-bold text-white">{{ edition.status.version || copy.notReported }}</dd>
            </div>
          </dl>
        </article>
      </div>

      <div v-else class="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
        {{ copy.checksUnavailable }}
      </div>

      <p v-if="status" class="mt-6 text-center text-lg font-bold text-white" role="status" aria-live="polite">
        {{ networkSummary }}
      </p>
    </section>

    <section class="grid gap-5 lg:grid-cols-3">
      <article class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 class="text-xl font-bold text-white">Java</h2>
        <p class="mt-3 text-zinc-400"><strong>play.cookie-build.com</strong></p>
      </article>
      <article class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 class="text-xl font-bold text-white">Bedrock</h2>
        <p class="mt-3 text-zinc-400"><strong>play.cookie-build.com</strong><br />{{ copy.port }} <strong>19132</strong></p>
      </article>
      <article class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 class="text-xl font-bold text-white">{{ copy.needHelp }}</h2>
        <p class="mt-3 text-zinc-400">{{ copy.helpText }}</p>
        <NuxtLink :to="localizePath('/support')" class="mt-4 inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">
          {{ copy.openSupport }}
        </NuxtLink>
      </article>
    </section>

    <section class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
      <h2 class="text-lg font-bold text-white">{{ copy.howTitle }}</h2>
      <p class="mt-3">
        {{ copy.howText }}
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ alias: ["/fr/status", "/de/status", "/it/status", "/bg/status", "/es/status", "/hi/status", "/pt-br/status"] });

import { RefreshCw } from "@lucide/vue";
import Badge from "@/components/ui/badge/Badge.vue";
import { Button } from "@/components/ui/button";
import { publicPageSeo } from "@/utils/public-page-seo";
import { STATUS_COPY } from "@/utils/status-copy";

interface EditionStatus {
  online: boolean;
  reachable: boolean;
  players: number;
  version: string | null;
}

interface ServerStatus {
  checkedAt: string;
  online: boolean;
  players: number;
  java: EditionStatus;
  bedrock: EditionStatus;
}



const { locale, localizePath } = useSiteLocale();
const copy = computed(() => STATUS_COPY[locale.value.code]);

const { data: status, pending, refresh } = await useFetch<ServerStatus>("/api/server-status");

const editions = computed(() => status.value
  ? [
      { id: "java", name: copy.value.javaEdition, status: status.value.java },
      { id: "bedrock", name: copy.value.bedrockEdition, status: status.value.bedrock },
    ]
  : []);

const checkedAtLabel = computed(() => {
  if (pending.value) return copy.value.checking;
  if (!status.value?.checkedAt) return copy.value.noRecentCheck;
  const checkedAt = new Date(status.value.checkedAt);
  if (Number.isNaN(checkedAt.getTime())) return copy.value.noRecentCheck;
  return `${copy.value.lastChecked} ${new Intl.DateTimeFormat(copy.value.locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(checkedAt)}`;
});

const networkSummary = computed(() => {
  if (!status.value) return copy.value.checkUnavailable;
  const { java, bedrock, players } = status.value;
  if (java.online && bedrock.online) {
    return players === 0 ? copy.value.bothOnlineZero : copy.value.playersOnline(players);
  }
  if (java.online || bedrock.online) return copy.value.partial;
  if (!java.reachable && !bedrock.reachable) return copy.value.outageUnconfirmed;
  if (!java.reachable || !bedrock.reachable) return copy.value.partialNoOnline;
  return copy.value.networkOffline;
});

function statusLabel(edition: EditionStatus) {
  if (!edition.reachable) return copy.value.checkUnavailable;
  return edition.online ? copy.value.online : copy.value.offline;
}

function statusTone(edition: EditionStatus) {
  if (!edition.reachable) return "bg-amber-500/15 text-amber-200";
  return edition.online ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200";
}

const seo = computed(() => publicPageSeo(locale.value.code, "status"));
useLocalizedSeo("/status", () => seo.value.title, () => seo.value.description);
</script>
