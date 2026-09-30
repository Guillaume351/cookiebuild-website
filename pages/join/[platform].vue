<template>
  <div class="space-y-14">
    <nav :aria-label="guide.ui.breadcrumbLabel" class="text-sm">
      <ol class="flex flex-wrap items-center gap-1 text-zinc-400">
        <li class="flex items-center gap-1">
          <NuxtLink :to="localizePath('/')" class="inline-flex min-h-11 items-center font-semibold hover:text-orange-300">
            {{ guide.ui.home }}
          </NuxtLink>
          <ChevronRight class="h-4 w-4 text-zinc-600" aria-hidden="true" />
        </li>
        <li class="flex items-center gap-1">
          <NuxtLink :to="localizePath('/join')" class="inline-flex min-h-11 items-center font-semibold hover:text-orange-300">
            {{ guide.ui.join }}
          </NuxtLink>
          <ChevronRight class="h-4 w-4 text-zinc-600" aria-hidden="true" />
        </li>
        <li>
          <span aria-current="page" class="inline-flex min-h-11 items-center font-semibold text-white">{{ platform.cardTitle }}</span>
        </li>
      </ol>
    </nav>

    <section class="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-zinc-950 text-white shadow-2xl">
      <div class="absolute inset-0 bg-gradient-to-br from-orange-950/50 via-zinc-950 to-zinc-950" aria-hidden="true"></div>
      <div class="relative px-6 py-12 md:px-12 md:py-16">
        <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600/15 text-orange-400">
          <component :is="platformIcon" class="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 class="mt-6 max-w-4xl text-4xl font-black tracking-tight text-white md:text-5xl">{{ platform.h1 }}</h1>
        <p class="mt-5 max-w-3xl text-lg leading-relaxed text-zinc-300 md:text-xl">{{ platform.intro }}</p>

        <div v-if="platformId === 'mobile'" class="mt-8">
          <a
            :href="'minecraft://?addExternalServer=CookieBuild|play.cookie-build.com:19132'"
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-7 text-base font-bold text-white hover:bg-green-700"
          >
            <Plus class="h-5 w-5" aria-hidden="true" />
            {{ guide.ui.addToMinecraft }}
          </a>
          <p class="mt-3 max-w-2xl text-sm text-zinc-400">{{ guide.ui.addToMinecraftNote }}</p>
        </div>
      </div>
    </section>

    <section aria-labelledby="join-address-title" class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl md:p-8">
        <h2 id="join-address-title" class="text-2xl font-black tracking-tight text-white">{{ guide.ui.addressHeading }}</h2>
        <p class="mt-3 leading-relaxed text-zinc-400">
          {{ platformId === "java" ? guide.ui.javaAddressBody : guide.ui.bedrockAddressBody }}
        </p>
        <div class="mt-6 grid gap-4" :class="{ 'sm:grid-cols-2': platformId !== 'java' }">
          <JoinAddress :address="serverIP" :label="copy.common.serverAddress" @copy="copyToClipboard(serverIP, copy.common.serverAddress)" />
          <JoinAddress
            v-if="platformId !== 'java'"
            :address="bedrockPort"
            :label="copy.common.bedrockPort"
            @copy="copyToClipboard(bedrockPort, copy.common.bedrockPort)"
          />
        </div>
      </div>

      <div v-if="consoleId" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 md:p-8">
        <h2 class="text-2xl font-black tracking-tight text-white">{{ guide.ui.dnsServersHeading }}</h2>
        <dl class="mt-5 grid gap-4 sm:grid-cols-2">
          <div class="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <dt class="text-[10px] font-black uppercase tracking-widest text-zinc-500">{{ guide.ui.primaryDnsLabel }}</dt>
            <dd class="mt-2 font-mono text-lg font-bold text-white">{{ primaryDns }}</dd>
          </div>
          <div class="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <dt class="text-[10px] font-black uppercase tracking-widest text-zinc-500">{{ guide.ui.secondaryDnsLabel }}</dt>
            <dd class="mt-2 font-mono text-lg font-bold text-white">{{ BEDROCK_CONNECT_DNS.secondary }}</dd>
          </div>
        </dl>
        <p class="mt-5 text-sm font-bold text-zinc-300">{{ guide.ui.alternativeDnsLabel }}</p>
        <ul class="mt-3 grid gap-2 sm:grid-cols-2">
          <li
            v-for="instance in alternativeDns"
            :key="instance.ip"
            class="flex items-center justify-between gap-3 rounded-lg bg-zinc-950 px-3 py-2 text-sm"
          >
            <span class="font-mono font-bold text-white">{{ instance.ip }}</span>
            <span class="text-zinc-500">{{ instance.region }}</span>
          </li>
        </ul>
        <p class="mt-5 text-xs text-zinc-500">
          <a :href="BEDROCK_CONNECT_URL" target="_blank" rel="noopener noreferrer" class="underline hover:text-orange-300">
            {{ guide.ui.dnsSource }}
          </a>
        </p>
      </div>
    </section>

    <section aria-labelledby="join-methods-title">
      <h2 id="join-methods-title" class="text-3xl font-black tracking-tight text-white md:text-4xl">{{ guide.ui.methodsHeading }}</h2>
      <div class="mt-8 space-y-8">
        <article
          v-for="method in platform.methods"
          :id="`method-${method.id}`"
          :key="method.id"
          class="rounded-3xl border bg-zinc-900 p-6 md:p-8"
          :class="method.recommended ? 'border-orange-500/40' : 'border-zinc-800'"
        >
          <div class="flex flex-wrap items-center gap-3">
            <h3 class="text-2xl font-black text-white">{{ method.name }}</h3>
            <span v-if="method.recommended" class="rounded-full bg-orange-600 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
              {{ guide.ui.recommended }}
            </span>
          </div>
          <p class="mt-3 max-w-3xl leading-relaxed text-zinc-400">{{ method.intro }}</p>

          <ol class="mt-7 space-y-5">
            <li v-for="(step, index) in method.steps" :key="`${method.id}-${index}`" class="flex gap-4">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-600 font-black text-white" aria-hidden="true">
                {{ index + 1 }}
              </span>
              <div class="min-w-0 pt-1">
                <p class="font-bold text-white">{{ step.name }}</p>
                <p class="mt-1 break-words leading-relaxed text-zinc-300">{{ step.text }}</p>
              </div>
            </li>
          </ol>

          <p v-if="method.note" class="mt-7 flex gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm leading-relaxed text-zinc-400">
            <Info class="mt-0.5 h-4 w-4 shrink-0 text-orange-400" aria-hidden="true" />
            <span>{{ method.note }}</span>
          </p>

          <div v-if="method.undo" class="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <h4 class="flex items-center gap-2 font-bold text-white">
              <Undo2 class="h-4 w-4 text-orange-400" aria-hidden="true" />
              {{ guide.ui.undoHeading }}
            </h4>
            <p class="mt-2 text-sm leading-relaxed text-zinc-400">{{ method.undo }}</p>
          </div>

          <div v-if="method.links?.length" class="mt-5 flex flex-wrap items-center gap-3">
            <span class="text-sm font-bold text-zinc-500">{{ guide.ui.linksLabel }}</span>
            <a
              v-for="link in method.links"
              :key="link.href"
              :href="link.href"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-bold text-zinc-200 hover:border-orange-500/60 hover:text-white"
            >
              {{ link.label }}
              <ExternalLink class="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </article>
      </div>
    </section>

    <section aria-labelledby="join-tips-title" class="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-8">
      <h2 id="join-tips-title" class="flex items-center gap-3 text-2xl font-black tracking-tight text-white">
        <Lightbulb class="h-6 w-6 text-orange-400" aria-hidden="true" />
        {{ guide.ui.tipsHeading }}
      </h2>
      <ul class="mt-5 space-y-3">
        <li v-for="tip in platform.tips" :key="tip" class="flex gap-3 leading-relaxed text-zinc-300">
          <span class="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" aria-hidden="true"></span>
          <span>{{ tip }}</span>
        </li>
      </ul>
    </section>

    <section aria-labelledby="join-faq-title" class="mx-auto max-w-4xl">
      <h2 id="join-faq-title" class="text-center text-3xl font-black tracking-tight text-white md:text-4xl">{{ guide.ui.faqHeading }}</h2>
      <div class="mt-9 space-y-4">
        <details v-for="faq in platform.faqs" :key="faq.question" class="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <summary class="min-h-11 cursor-pointer list-none pr-6 text-lg font-bold text-white">{{ faq.question }}</summary>
          <p class="mt-3 leading-relaxed text-zinc-400">{{ faq.answer }}</p>
        </details>
      </div>
    </section>

    <section aria-labelledby="join-other-title">
      <h2 id="join-other-title" class="text-2xl font-black tracking-tight text-white">{{ guide.ui.otherGuidesHeading }}</h2>
      <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="other in otherPlatforms" :key="other.id">
          <NuxtLink
            :to="other.path"
            class="group flex h-full min-h-11 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-orange-500/60"
          >
            <component :is="other.icon" class="h-5 w-5 shrink-0 text-orange-400" aria-hidden="true" />
            <span class="font-bold text-white group-hover:text-orange-200">{{ other.cardTitle }}</span>
          </NuxtLink>
        </li>
      </ul>
      <NuxtLink :to="localizePath('/join')" class="mt-5 inline-flex min-h-11 items-center gap-2 font-bold text-orange-400 hover:text-orange-300">
        <ArrowLeft class="h-4 w-4" aria-hidden="true" />
        {{ guide.ui.backToHub }}
      </NuxtLink>
    </section>

    <section aria-labelledby="join-help-title" class="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-950/40 via-zinc-950 to-zinc-950 p-8 md:p-12">
      <div class="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <h2 id="join-help-title" class="text-3xl font-black tracking-tight text-white">{{ guide.ui.helpHeading }}</h2>
          <p class="mt-4 max-w-3xl text-lg leading-relaxed text-zinc-300">{{ guide.ui.helpBody }}</p>
        </div>
        <a
          href="https://discord.gg/ajmPnwh9g8"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 font-bold text-white hover:bg-orange-700"
        >
          <MessageCircle class="h-5 w-5" aria-hidden="true" />
          {{ guide.ui.discordCta }}
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Gamepad2,
  Info,
  Lightbulb,
  MessageCircle,
  Monitor,
  Plus,
  Smartphone,
  Undo2,
} from "@lucide/vue";
import JoinAddress from "@/components/JoinAddress.vue";
import { COOKIE_BUILD_BEDROCK_PORT, COOKIE_BUILD_SERVER_IP } from "@/utils/game-landings";
import {
  BEDROCK_CONNECT_DNS,
  BEDROCK_CONNECT_URL,
  JOIN_GUIDE_COPY,
  JOIN_PLATFORMS,
  bedrockConnectPrimaryDns,
  isJoinConsole,
  isJoinPlatform,
  type JoinPlatformId,
} from "@/utils/join-guide-copy";
import { localizedAbsoluteUrl } from "@/utils/site-locales";

definePageMeta({ alias: ["/fr/rejoindre/:platform", "/de/join/:platform", "/it/join/:platform", "/bg/join/:platform", "/es/join/:platform", "/hi/join/:platform", "/pt-br/join/:platform"] });

const route = useRoute();
const initialPlatform = String(route.params.platform ?? "");
if (!isJoinPlatform(initialPlatform)) {
  throw createError({ statusCode: 404, statusMessage: "Guide not found" });
}

const serverIP = COOKIE_BUILD_SERVER_IP;
const bedrockPort = COOKIE_BUILD_BEDROCK_PORT;

const { locale, copy, localizePath } = useSiteLocale();
const { copyToClipboard } = useCopyToast();

const platformId = computed<JoinPlatformId>(() => {
  const value = String(route.params.platform ?? "");
  return isJoinPlatform(value) ? value : initialPlatform;
});
const consoleId = computed(() => (isJoinConsole(platformId.value) ? platformId.value : null));
const guide = computed(() => JOIN_GUIDE_COPY[locale.value.code]);
const platform = computed(() => guide.value.platforms[platformId.value]);
const canonicalPath = computed(() => `/join/${platformId.value}`);

const PLATFORM_ICONS: Record<JoinPlatformId, typeof Gamepad2> = {
  playstation: Gamepad2,
  xbox: Gamepad2,
  switch: Gamepad2,
  mobile: Smartphone,
  java: Monitor,
};
const platformIcon = computed(() => PLATFORM_ICONS[platformId.value]);

const primaryDns = computed(() => (consoleId.value ? bedrockConnectPrimaryDns(consoleId.value) : BEDROCK_CONNECT_DNS.primary));

const regionName = (region: string) => {
  try {
    return new Intl.DisplayNames([locale.value.htmlLang], { type: "region" }).of(region) || region;
  } catch {
    return region;
  }
};

const alternativeDns = computed(() => {
  // On PlayStation the main instance is itself a useful fallback.
  const extra = consoleId.value === "playstation" ? [{ ip: BEDROCK_CONNECT_DNS.primary, region: "US" }] : [];
  return [...extra, ...BEDROCK_CONNECT_DNS.alternatives].map((instance) => ({
    ip: instance.ip,
    region: regionName(instance.region),
  }));
});

const otherPlatforms = computed(() =>
  JOIN_PLATFORMS.filter((id) => id !== platformId.value).map((id) => ({
    id,
    icon: PLATFORM_ICONS[id],
    path: localizePath(`/join/${id}`),
    cardTitle: guide.value.platforms[id].cardTitle,
  })),
);

useLocalizedSeo(
  canonicalPath,
  () => platform.value.seoTitle,
  () => platform.value.metaDescription,
);

useHead(() => {
  const howToSections = platform.value.methods.map((method, methodIndex) => ({
    "@type": "HowToSection",
    name: method.name,
    position: methodIndex + 1,
    itemListElement: method.steps.map((step, stepIndex) => ({
      "@type": "HowToStep",
      position: stepIndex + 1,
      name: step.name,
      text: step.text,
    })),
  }));

  return {
    script: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "HowTo",
              name: platform.value.h1,
              description: platform.value.metaDescription,
              inLanguage: locale.value.htmlLang,
              url: localizedAbsoluteUrl(canonicalPath.value, locale.value),
              tool: [{ "@type": "HowToTool", name: "Minecraft" }],
              step: howToSections,
            },
            {
              "@type": "FAQPage",
              inLanguage: locale.value.htmlLang,
              mainEntity: platform.value.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
              })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: guide.value.ui.home, item: localizedAbsoluteUrl("/", locale.value) },
                { "@type": "ListItem", position: 2, name: guide.value.ui.join, item: localizedAbsoluteUrl("/join", locale.value) },
                { "@type": "ListItem", position: 3, name: platform.value.cardTitle, item: localizedAbsoluteUrl(canonicalPath.value, locale.value) },
              ],
            },
          ],
        }),
      },
    ],
  };
});
</script>
