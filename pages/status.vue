<template>
  <main class="mx-auto max-w-5xl space-y-10 py-12 text-zinc-300">
    <header class="space-y-4">
      <Badge class="bg-orange-600 hover:bg-orange-600">{{ copy.badge }}</Badge>
      <h1 class="text-4xl font-black tracking-tight text-white md:text-5xl">{{ copy.title }}</h1>
      <p class="max-w-3xl text-lg text-zinc-400">
        {{ copy.intro }}
      </p>
    </header>

    <nav class="flex flex-wrap gap-3" aria-label="Status language">
      <button
        v-for="language in languages"
        :key="language.id"
        type="button"
        class="min-h-11 rounded-lg border px-4 py-2 font-bold transition-colors"
        :class="selectedLanguage === language.id ? 'border-orange-400 bg-orange-600 text-white' : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'"
        :aria-pressed="selectedLanguage === language.id"
        @click="selectedLanguage = language.id"
      >
        {{ language.label }}
      </button>
    </nav>

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
        <NuxtLink to="/support" class="mt-4 inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">
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
import { RefreshCw } from "@lucide/vue";
import Badge from "@/components/ui/badge/Badge.vue";
import { Button } from "@/components/ui/button";

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

type LanguageId = "en" | "fr" | "es" | "pt-BR";

const languages: Array<{ id: LanguageId; label: string }> = [
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
  { id: "es", label: "Español" },
  { id: "pt-BR", label: "Português (Brasil)" },
];

const statusCopies = {
  en: {
    locale: "en",
    badge: "Live network status",
    title: "Cookie Build status",
    intro: "Independent checks for Java and Bedrock. An unavailable check is shown separately from a confirmed outage, and an online network can genuinely have zero players connected.",
    currentStatus: "Current status",
    checking: "Checking both editions…",
    noRecentCheck: "No recent check is available.",
    lastChecked: "Last checked",
    refresh: "Refresh checks",
    javaEdition: "Java Edition",
    bedrockEdition: "Bedrock Edition",
    playersReported: "Players reported",
    version: "Version",
    notReported: "Not reported",
    online: "Online",
    offline: "Offline",
    checkUnavailable: "Check unavailable",
    checksUnavailable: "The public status checks are temporarily unavailable. This does not by itself confirm a server outage.",
    bothOnlineZero: "Both editions are online · 0 players right now",
    playersOnline: (players: number) => `${players} ${players === 1 ? "player" : "players"} online`,
    partial: "Partial availability · check the edition details above",
    partialNoOnline: "Partial status · no edition is confirmed online",
    outageUnconfirmed: "Status checks unavailable · outage not confirmed",
    networkOffline: "The Minecraft network is currently offline",
    port: "Port",
    needHelp: "Need help?",
    helpText: "Check your edition and address, then contact support if the issue continues.",
    openSupport: "Open support",
    howTitle: "How these checks work",
    howText: "The page uses short-lived public Minecraft protocol checks. Java and Bedrock share the same Cookie Build network, so the headline uses the larger reported count instead of adding both figures and potentially counting a player twice.",
  },
  fr: {
    locale: "fr-FR",
    badge: "État du réseau en direct",
    title: "État de Cookie Build",
    intro: "Java et Bedrock sont vérifiés séparément. Une vérification indisponible est distinguée d’une panne confirmée, et un réseau en ligne peut réellement compter zéro joueur connecté.",
    currentStatus: "État actuel",
    checking: "Vérification des deux éditions…",
    noRecentCheck: "Aucune vérification récente n’est disponible.",
    lastChecked: "Dernière vérification",
    refresh: "Actualiser",
    javaEdition: "Édition Java",
    bedrockEdition: "Édition Bedrock",
    playersReported: "Joueurs annoncés",
    version: "Version",
    notReported: "Non indiquée",
    online: "En ligne",
    offline: "Hors ligne",
    checkUnavailable: "Vérification indisponible",
    checksUnavailable: "Les vérifications publiques sont temporairement indisponibles. Cela ne confirme pas à lui seul une panne du serveur.",
    bothOnlineZero: "Les deux éditions sont en ligne · 0 joueur actuellement",
    playersOnline: (players: number) => `${players} joueur${players === 1 ? "" : "s"} en ligne`,
    partial: "Disponibilité partielle · consulte les détails de chaque édition",
    partialNoOnline: "État partiel · aucune édition n’est confirmée en ligne",
    outageUnconfirmed: "Vérifications indisponibles · panne non confirmée",
    networkOffline: "Le réseau Minecraft est actuellement hors ligne",
    port: "Port",
    needHelp: "Besoin d’aide ?",
    helpText: "Vérifie ton édition et l’adresse, puis contacte le support si le problème continue.",
    openSupport: "Ouvrir le support",
    howTitle: "Fonctionnement des vérifications",
    howText: "Cette page utilise de brèves vérifications publiques du protocole Minecraft. Java et Bedrock partagent le même réseau Cookie Build : le total retient donc la valeur la plus élevée au lieu d’additionner les deux et de risquer de compter un joueur deux fois.",
  },
  es: {
    locale: "es-ES",
    badge: "Estado de la red en directo",
    title: "Estado de Cookie Build",
    intro: "Java y Bedrock se comprueban por separado. Una comprobación no disponible se distingue de una caída confirmada, y una red online puede tener realmente cero jugadores conectados.",
    currentStatus: "Estado actual",
    checking: "Comprobando las dos ediciones…",
    noRecentCheck: "No hay ninguna comprobación reciente disponible.",
    lastChecked: "Última comprobación",
    refresh: "Actualizar comprobaciones",
    javaEdition: "Edición Java",
    bedrockEdition: "Edición Bedrock",
    playersReported: "Jugadores indicados",
    version: "Versión",
    notReported: "No indicada",
    online: "Online",
    offline: "Offline",
    checkUnavailable: "Comprobación no disponible",
    checksUnavailable: "Las comprobaciones públicas no están disponibles temporalmente. Esto no confirma por sí solo una caída del servidor.",
    bothOnlineZero: "Las dos ediciones están online · 0 jugadores ahora",
    playersOnline: (players: number) => `${players} ${players === 1 ? "jugador online" : "jugadores online"}`,
    partial: "Disponibilidad parcial · consulta los detalles de cada edición",
    partialNoOnline: "Estado parcial · ninguna edición está confirmada como online",
    outageUnconfirmed: "Comprobaciones no disponibles · caída no confirmada",
    networkOffline: "La red de Minecraft está offline en este momento",
    port: "Puerto",
    needHelp: "¿Necesitas ayuda?",
    helpText: "Comprueba tu edición y la dirección. Si el problema continúa, contacta con soporte.",
    openSupport: "Abrir soporte",
    howTitle: "Cómo funcionan las comprobaciones",
    howText: "La página usa comprobaciones públicas y breves del protocolo de Minecraft. Java y Bedrock comparten la misma red de Cookie Build, por lo que el resumen utiliza el número más alto en vez de sumar ambos y contar posiblemente a una persona dos veces.",
  },
  "pt-BR": {
    locale: "pt-BR",
    badge: "Status da rede ao vivo",
    title: "Status do Cookie Build",
    intro: "Java e Bedrock são verificados separadamente. Uma verificação indisponível aparece de forma diferente de uma queda confirmada, e uma rede online pode realmente estar com zero jogadores conectados.",
    currentStatus: "Status atual",
    checking: "Verificando as duas edições…",
    noRecentCheck: "Nenhuma verificação recente está disponível.",
    lastChecked: "Última verificação",
    refresh: "Atualizar verificações",
    javaEdition: "Edição Java",
    bedrockEdition: "Edição Bedrock",
    playersReported: "Jogadores informados",
    version: "Versão",
    notReported: "Não informada",
    online: "Online",
    offline: "Offline",
    checkUnavailable: "Verificação indisponível",
    checksUnavailable: "As verificações públicas estão temporariamente indisponíveis. Isso, por si só, não confirma uma queda do servidor.",
    bothOnlineZero: "As duas edições estão online · 0 jogadores agora",
    playersOnline: (players: number) => `${players} ${players === 1 ? "jogador online" : "jogadores online"}`,
    partial: "Disponibilidade parcial · confira os detalhes de cada edição",
    partialNoOnline: "Status parcial · nenhuma edição está confirmada como online",
    outageUnconfirmed: "Verificações indisponíveis · queda não confirmada",
    networkOffline: "A rede Minecraft está offline no momento",
    port: "Porta",
    needHelp: "Precisa de ajuda?",
    helpText: "Confirme sua edição e o endereço. Se o problema continuar, fale com o suporte.",
    openSupport: "Abrir suporte",
    howTitle: "Como as verificações funcionam",
    howText: "A página usa verificações públicas e breves do protocolo Minecraft. Java e Bedrock compartilham a mesma rede Cookie Build, então o resumo usa o maior número informado em vez de somar os dois e possivelmente contar uma pessoa duas vezes.",
  },
} as const;

const selectedLanguage = ref<LanguageId>("en");
const copy = computed(() => statusCopies[selectedLanguage.value]);

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

useSeoMeta({
  title: "Server Status | Cookie Build",
  description: "Live Java and Bedrock status in English, French, Spanish, and Brazilian Portuguese.",
});

useHead({ link: [{ rel: "canonical", href: "https://www.cookie-build.com/status" }] });
</script>
