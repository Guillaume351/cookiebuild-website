<template>
  <div class="space-y-20">
    <!-- Hero Section -->
    <section
      aria-labelledby="home-title"
      class="relative overflow-hidden rounded-3xl bg-gray-900 text-center text-white shadow-2xl"
      :class="seasonalHeroClass"
    >
      <img
        src="/lobby-hero-clean-960.webp"
        srcset="/lobby-hero-clean-960.webp 960w, /lobby-hero-clean-1600.webp 1600w"
        sizes="(min-width: 1536px) 1504px, 100vw"
        width="1600"
        height="1034"
        fetchpriority="high"
        decoding="async"
        :alt="copy.common.socialImageAlt"
        class="absolute inset-0 z-0 h-full w-full object-cover opacity-50"
      />
      <div
        class="absolute inset-0 z-10 bg-gradient-to-t from-gray-900 via-transparent to-black/30"
        aria-hidden="true"
      ></div>
      <!-- Seasonal skin: decorative only, absolutely positioned (no layout shift). -->
      <div v-if="halloween" class="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
        <div class="absolute inset-0 bg-gradient-to-b from-purple-950/60 via-purple-900/10 to-orange-950/50"></div>
        <div class="halloween-moon absolute right-[7%] top-6 h-14 w-14 rounded-full md:right-[9%] md:top-10 md:h-24 md:w-24"></div>
        <svg
          v-for="bat in HALLOWEEN_BATS"
          :key="bat.id"
          class="halloween-bat absolute"
          :class="bat.class"
          :style="bat.style"
          viewBox="0 0 64 28"
          fill="currentColor"
        >
          <path d="M32 11 L30 5 L28.5 10.5 Q22 8 12 7 Q6 8 2 12 Q7 12 11 17 Q14 14 19 19 Q22 17 27 22 L32 26 L37 22 Q42 17 45 19 Q50 14 53 17 Q57 12 62 12 Q58 8 52 7 Q42 8 35.5 10.5 L34 5 Z" />
        </svg>
        <svg
          v-for="pumpkin in HALLOWEEN_PUMPKINS"
          :key="pumpkin.id"
          class="halloween-pumpkin absolute bottom-3"
          :class="pumpkin.class"
          :style="pumpkin.style"
          viewBox="0 0 48 40"
        >
          <path d="M23 9 Q22 4 26 1 L28 3 Q25 5 26 9 Z" fill="#4d7c0f" />
          <ellipse cx="15" cy="24" rx="12" ry="14" fill="#c2410c" />
          <ellipse cx="33" cy="24" rx="12" ry="14" fill="#c2410c" />
          <ellipse cx="24" cy="24" rx="11" ry="15" fill="#f97316" />
          <path class="halloween-pumpkin-face" d="M14 21 L17 15 L20 21 Z M28 21 L31 15 L34 21 Z M13 27 Q24 37 35 27 L31 28 L29 26 L27 29 L24 27 L21 29 L19 26 L17 28 Z" fill="#fde047" />
        </svg>
      </div>
      <!-- Christmas: snowy lobby at dusk, falling snow, a string of warm lights. CSS and inline SVG only. -->
      <div v-if="christmas" class="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
        <div class="absolute inset-0 bg-gradient-to-b from-indigo-950/70 via-sky-950/10 to-amber-950/30"></div>
        <div class="christmas-glow absolute inset-x-0 bottom-0 h-1/2"></div>
        <div class="christmas-snow christmas-snow-far absolute inset-0"></div>
        <div class="christmas-snow christmas-snow-near absolute inset-0"></div>
        <svg class="absolute inset-x-0 top-0 h-10 w-full md:h-14" viewBox="0 0 400 40" preserveAspectRatio="none">
          <path d="M0 6 Q50 30 100 8 Q150 30 200 8 Q250 30 300 8 Q350 30 400 6" fill="none" stroke="#0f172a" stroke-width="1.5" vector-effect="non-scaling-stroke" />
        </svg>
        <div class="absolute inset-x-0 top-0 h-10 md:h-14">
          <span
            v-for="bulb in CHRISTMAS_LIGHTS"
            :key="bulb.id"
            class="christmas-bulb absolute h-1.5 w-1.5 rounded-full md:h-2 md:w-2"
            :class="bulb.class"
            :style="bulb.style"
          ></span>
        </div>
        <svg
          v-for="flake in CHRISTMAS_FLAKES"
          :key="flake.id"
          class="christmas-flake absolute text-sky-100/70"
          :class="flake.class"
          :style="flake.style"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        >
          <path d="M12 2v20M3.34 7l17.32 10M3.34 17 20.66 7M12 5.5 9.8 3.3M12 5.5l2.2-2.2M12 18.5l-2.2 2.2M12 18.5l2.2 2.2M6.4 8.75 3.4 9.6M6.4 8.75 5.6 5.75M17.6 15.25l3 .85M17.6 15.25l.8 3M6.4 15.25l-3-.85M6.4 15.25l-.8 3M17.6 8.75l3-.85M17.6 8.75l.8-3" />
        </svg>
        <svg class="absolute inset-x-0 bottom-0 h-10 w-full md:h-16" viewBox="0 0 400 40" preserveAspectRatio="none">
          <path d="M0 24 Q30 14 70 22 T150 20 T240 24 T320 18 T400 22 V40 H0 Z" fill="#e0f2fe" fill-opacity=".35" />
          <path d="M0 30 Q50 22 110 28 T220 27 T330 30 T400 26 V40 H0 Z" fill="#f8fafc" fill-opacity=".8" />
        </svg>
        <svg class="christmas-snowman absolute bottom-1 left-[3%] w-10 md:bottom-2 md:w-14" viewBox="0 0 40 56">
          <circle cx="20" cy="42" r="12" fill="#f8fafc" />
          <circle cx="20" cy="22" r="9" fill="#f8fafc" />
          <path d="M11 27 Q20 31 29 27 L29 30 Q20 34 11 30 Z" fill="#dc2626" />
          <path d="M26 28 L28 36 L24 35 Z" fill="#dc2626" />
          <circle cx="17" cy="20" r="1.2" fill="#1e293b" />
          <circle cx="23" cy="20" r="1.2" fill="#1e293b" />
          <path d="M20 22.5 L26 24 L20 24.5 Z" fill="#f97316" />
          <circle cx="20" cy="38" r="1.2" fill="#1e293b" />
          <circle cx="20" cy="44" r="1.2" fill="#1e293b" />
          <path d="M12 13 H28 V15 H12 Z M15 4 H25 V13 H15 Z" fill="#1e293b" />
        </svg>
      </div>

      <div class="relative z-20 px-6 py-20 md:py-28">
        <NuxtLink
          v-if="seasonal"
          :to="seasonal.href"
          class="group mx-auto mb-8 flex max-w-2xl items-start gap-4 rounded-2xl border p-4 text-left backdrop-blur focus-visible:outline-none focus-visible:ring-2 md:p-5"
          :class="seasonal.style.banner"
        >
          <span aria-hidden="true" class="shrink-0 text-3xl leading-none md:text-4xl">{{ seasonal.style.icon }}</span>
          <span class="min-w-0">
            <span class="block text-[11px] font-black uppercase tracking-widest" :class="seasonal.style.accent">{{ seasonal.bannerEyebrow }}</span>
            <span class="mt-1 block text-lg font-black text-white md:text-xl">{{ seasonal.bannerTitle }}</span>
            <span class="mt-1 block text-sm leading-relaxed text-zinc-200">{{ seasonal.bannerText }}</span>
            <span class="mt-2 inline-flex items-center text-sm font-black" :class="seasonal.style.cta">{{ seasonal.bannerCta }} →</span>
          </span>
        </NuxtLink>
        <p class="mb-4 text-lg font-black uppercase tracking-[0.25em] text-orange-400 drop-shadow">
          Cookie Build <span aria-hidden="true">🍪</span>
        </p>
        <h1
          id="home-title"
          class="mx-auto mb-6 max-w-4xl text-4xl font-extrabold tracking-tight drop-shadow-lg md:text-6xl"
        >
          {{ copy.home.h1 }}
        </h1>
        <p
          class="mx-auto mb-8 max-w-2xl text-lg font-medium text-gray-200 drop-shadow-md md:text-xl"
        >
          {{ copy.home.hero }}
        </p>

        <div class="mx-auto mb-8 grid max-w-xl gap-3 text-left sm:grid-cols-[1fr_auto]">
          <div class="rounded-xl border border-white/15 bg-black/55 p-3 backdrop-blur">
            <p class="text-[11px] font-black uppercase tracking-widest text-zinc-300">{{ copy.gameUi.connectionAddress }}</p>
            <div class="mt-1 flex items-center justify-between gap-3">
              <code class="select-all whitespace-nowrap font-mono text-[15px] font-bold text-white sm:text-base md:text-lg">{{ SERVER_ADDRESS }}</code>
              <button
                type="button"
                class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-white/15 px-3 text-sm font-bold text-white hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                :aria-label="`${copy.common.copy} ${copy.common.serverAddress}`"
                @click="copyText(SERVER_ADDRESS, copy.common.serverAddress)"
              >
                <Copy class="h-4 w-4 sm:mr-2" aria-hidden="true" />
                <span class="hidden sm:inline">{{ copy.home.copyIp }}</span>
              </button>
            </div>
          </div>
          <div class="rounded-xl border border-white/15 bg-black/55 p-3 backdrop-blur">
            <p class="text-[11px] font-black uppercase tracking-widest text-zinc-300">{{ copy.common.bedrockPort }}</p>
            <div class="mt-1 flex items-center justify-between gap-3">
              <code class="select-all font-mono text-base font-bold text-white md:text-lg">{{ BEDROCK_PORT }}</code>
              <button
                type="button"
                class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                :aria-label="`${copy.common.copy} ${copy.common.bedrockPort}`"
                @click="copyText(BEDROCK_PORT, copy.common.bedrockPort)"
              >
                <Copy class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <PlayerCounter class="mb-8 justify-center" :next-event="nextEvent" />

        <div class="flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
          <a
            :href="BEDROCK_ADD_SERVER_URL"
            class="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-green-600 px-8 text-lg font-bold text-white hover:bg-green-700 sm:w-auto md:hidden"
            @click="siteAnalytics.track('bedrock_server_add')"
          >
            <Gamepad2 class="mr-2 h-6 w-6" aria-hidden="true" />
            {{ copy.home.addBedrockDirect }}
          </a>
          <Button
            size="lg"
            class="w-full bg-orange-600 px-8 text-lg font-bold hover:bg-orange-700 sm:w-auto motion-safe:animate-pulse hover:animate-none focus-visible:animate-none"
            @click="showJoinGuide = true; siteAnalytics.track('join_guide_open')"
          >
            <Gamepad2 class="mr-2 h-6 w-6" aria-hidden="true" />
            {{ copy.home.playNow }}
          </Button>
          <a
            :href="DISCORD_INVITE_URL"
            target="_blank"
            rel="noopener"
            class="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-white/20 bg-white/10 px-8 py-3 text-lg font-semibold text-white backdrop-blur-sm hover:bg-white/20 sm:w-auto"
            @click="siteAnalytics.track('discord_open')"
          >
            <Mic class="mr-2 h-6 w-6" aria-hidden="true" />
            {{ copy.home.joinDiscord }}
          </a>
        </div>
        <p class="mt-6 text-sm">
          <NuxtLink :to="localizePath('/join')" class="font-bold text-orange-200 underline underline-offset-4 hover:text-white">
            {{ copy.home.joinGuidesLink }} →
          </NuxtLink>
        </p>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="showJoinGuide"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-title"
        @click.self="showJoinGuide = false"
        @keydown.esc="showJoinGuide = false"
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
              <X class="h-5 w-5" aria-hidden="true" />
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
            <JoinAddress :address="SERVER_ADDRESS" :label="copy.common.serverAddress" @copy="copyText(SERVER_ADDRESS, copy.common.serverAddress)" />
            <NuxtLink :to="localizePath('/join/java')" class="inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">{{ copy.home.joinGuidesLink }} →</NuxtLink>
          </div>

          <div v-else-if="selectedEdition === 'bedrock'" class="space-y-5 text-zinc-300">
            <ol class="list-decimal space-y-2 pl-5">
              <li v-for="step in copy.home.bedrockSteps" :key="step">{{ step }}</li>
            </ol>
            <div class="grid gap-3 sm:grid-cols-2">
              <JoinAddress :address="SERVER_ADDRESS" :label="copy.common.serverAddress" @copy="copyText(SERVER_ADDRESS, copy.common.serverAddress)" />
              <JoinAddress :address="BEDROCK_PORT" :label="copy.common.bedrockPort" @copy="copyText(BEDROCK_PORT, copy.common.bedrockPort)" />
            </div>
            <a
              :href="BEDROCK_ADD_SERVER_URL"
              class="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700"
              @click="siteAnalytics.track('bedrock_server_add')"
            >
              <Gamepad2 class="mr-2 h-5 w-5" aria-hidden="true" />
              {{ copy.home.addBedrock }}
            </a>
            <p class="text-xs text-zinc-500">{{ copy.home.bedrockFallback }}</p>
            <NuxtLink :to="localizePath('/join/mobile')" class="inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">{{ copy.home.joinGuidesLink }} →</NuxtLink>
          </div>

          <div v-else class="space-y-5 text-zinc-300">
            <p>{{ copy.home.consoleText }}</p>
            <div class="grid gap-3 sm:grid-cols-3">
              <NuxtLink
                v-for="console in consoles"
                :key="console.path"
                :to="localizePath(console.path)"
                class="inline-flex min-h-12 items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
              >
                {{ console.label }}
              </NuxtLink>
            </div>
            <NuxtLink :to="localizePath('/join')" class="inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">{{ copy.home.consoleGuide }} →</NuxtLink>
            <p class="text-sm text-zinc-500">{{ copy.home.consoleNotice }}</p>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Minigames Grid -->
    <section aria-labelledby="minigames-title">
      <h2 id="minigames-title" class="mb-10 text-center text-3xl font-bold tracking-tight md:text-4xl text-foreground">
        {{ copy.home.minigamesTitle }}
      </h2>
      <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
        <Card
          v-for="game in minigames"
          :key="game.name"
          class="group relative overflow-hidden border-border bg-card transition-all duration-300 hover:border-orange-500/50 hover:shadow-2xl motion-reduce:transition-none"
        >
          <div
            v-if="game.new"
            class="absolute right-0 top-0 rounded-bl-xl bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-sm"
          >
            {{ game.cornerLabel ?? copy.common.beta }}
          </div>
          <CardHeader>
            <CardTitle class="flex items-center gap-3 text-2xl">
              <img :src="game.icon" alt="" width="32" height="32" class="h-8 w-8 transition-transform group-hover:scale-110 motion-reduce:transition-none" />
              <h3>{{ game.name }}</h3>
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

    <!-- Build Battle best of the week (client-only, hidden when empty) -->
    <BuildBestOfStrip variant="home" />

    <!-- Screenshot gallery -->
    <section aria-labelledby="gallery-title">
      <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="gallery-title" class="text-3xl font-black tracking-tight text-white md:text-4xl">{{ copy.home.galleryTitle }}</h2>
          <p class="mt-3 max-w-2xl text-zinc-400">{{ copy.home.galleryIntro }}</p>
        </div>
        <NuxtLink :to="localizePath('/maps')" class="inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">
          {{ copy.home.galleryAll }} →
        </NuxtLink>
      </div>
      <ul class="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <li v-for="shot in gallery" :key="shot.slug">
          <NuxtLink :to="localizePath(`/maps/${shot.slug}`)" class="group block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
            <img
              :src="shot.image"
              :alt="shot.alt"
              width="1200"
              height="900"
              loading="lazy"
              decoding="async"
              sizes="(min-width: 768px) 33vw, 50vw"
              class="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            <span class="block px-3 py-2 text-sm font-bold text-zinc-200">{{ shot.game }} · {{ shot.name }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

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
            <NuxtLink :to="localizePath('/updates')">{{ copy.home.allUpdates }}</NuxtLink>
          </Button>
        </div>
      </div>
    </section>

    <section aria-labelledby="shop-promo-title" class="flex flex-col gap-6 rounded-2xl border border-emerald-300/30 bg-gradient-to-r from-zinc-900 to-emerald-950/30 p-6 md:flex-row md:items-center md:justify-between md:p-8">
      <div class="max-w-2xl">
        <p class="text-sm font-bold uppercase tracking-wider text-emerald-300">{{ copy.home.shopBadge }}</p>
        <h2 id="shop-promo-title" class="mt-2 text-2xl font-black text-white">{{ copy.home.shopTitle }}</h2>
        <p class="mt-3 text-zinc-400">{{ copy.home.shopBody }}</p>
      </div>
      <NuxtLink :to="localizePath('/shop')" @click="shopAnalytics.track('free_effect_click', { source: 'home' }); siteAnalytics.track('shop_entry')" class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-emerald-300 px-5 py-3 font-black text-zinc-950 hover:bg-emerald-200">{{ copy.home.shopCta }}</NuxtLink>
    </section>

    <section v-if="latestUpdates.length" aria-labelledby="latest-updates-title">
      <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge class="mb-3 bg-orange-600 hover:bg-orange-600">{{ copy.home.latestBadge }}</Badge>
          <h2 id="latest-updates-title" class="text-3xl font-black tracking-tight text-white md:text-4xl">{{ copy.home.latestTitle }}</h2>
          <p class="mt-3 max-w-2xl text-zinc-400">{{ copy.home.latestIntro }}</p>
        </div>
        <NuxtLink :to="localizePath('/updates')" class="inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">
          {{ copy.home.latestAll }}
        </NuxtLink>
      </div>
      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <UpdatePostCard v-for="post in latestUpdates" :key="post.id" :post="post" compact heading-level="h3" />
      </div>
    </section>

    <!-- Features Grid -->
    <section>
      <div class="grid gap-8 md:grid-cols-3">
        <Card
          v-for="feature in features"
          :key="feature.title"
          class="border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <CardHeader>
            <CardTitle class="flex items-center gap-3 text-xl">
              <div class="rounded-lg bg-secondary p-2">
                <img :src="feature.icon" alt="" width="24" height="24" class="h-6 w-6" />
              </div>
              <h3>{{ feature.title }}</h3>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-muted-foreground">{{ feature.description }}</p>
          </CardContent>
        </Card>
      </div>
    </section>

    <!-- Legacy / History Section -->
    <section class="text-center" aria-labelledby="history-title">
      <div class="mx-auto max-w-4xl border-t border-zinc-800 pt-16 mt-10">
        <h2 id="history-title" class="mb-6 text-2xl font-bold text-white">
          {{ copy.home.history }}
        </h2>
        <p class="mb-8 text-lg text-zinc-400 leading-relaxed">
          {{ copy.home.historyBody }}
        </p>
        <dl class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="rounded-xl bg-zinc-900 p-4 border border-zinc-800">
            <dt class="text-zinc-500 text-[10px] font-bold uppercase mb-1">{{ copy.home.launched }}</dt>
            <dd class="text-xl font-bold text-white">2014</dd>
          </div>
          <div class="rounded-xl bg-zinc-900 p-4 border border-zinc-800">
            <dt class="text-zinc-500 text-[10px] font-bold uppercase mb-1">{{ copy.home.peakScale }}</dt>
            <dd class="text-xl font-bold text-white">{{ peakPlayers }}+ {{ copy.home.players }}</dd>
          </div>
          <div class="rounded-xl bg-zinc-900 p-4 border border-zinc-800">
            <dt class="text-zinc-500 text-[10px] font-bold uppercase mb-1">{{ copy.home.projectStatus }}</dt>
            <dd class="text-xl font-bold text-white">{{ copy.home.active }}</dd>
          </div>
        </dl>
        <NuxtLink :to="localizePath('/history')" class="mt-8 inline-flex min-h-11 items-center font-bold text-orange-300 hover:text-orange-200">
          {{ copy.home.historyLink }} →
        </NuxtLink>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="mx-auto max-w-4xl" aria-labelledby="faq-title">
      <h2 id="faq-title" class="mb-10 text-center text-3xl font-bold tracking-tight md:text-4xl text-foreground">
        {{ copy.home.faqTitle }}
      </h2>
      <div class="grid gap-6 md:grid-cols-2">
        <div v-for="(faq, index) in faqs" :key="index" class="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 class="mb-3 text-lg font-bold text-foreground">{{ faq.question }}</h3>
          <p class="text-muted-foreground">{{ faq.answer }}</p>
          <NuxtLink v-if="index === 0" :to="localizePath('/join')" class="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-orange-400 hover:text-orange-300">
            {{ copy.home.joinGuidesLink }} →
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- About Section -->
    <section class="rounded-3xl bg-secondary/30 p-8 md:p-12" aria-labelledby="about-title">
      <h2 id="about-title" class="mb-6 text-3xl font-bold tracking-tight text-foreground">{{ copy.home.aboutTitle }}</h2>
      <div class="max-w-3xl space-y-4 text-muted-foreground">
        <p v-for="paragraph in copy.home.aboutBody" :key="paragraph">{{ paragraph }}</p>
      </div>
      <div class="mt-8 flex flex-wrap gap-4">
        <a :href="DISCORD_INVITE_URL" target="_blank" rel="noopener" class="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-indigo-300 hover:text-indigo-200">
          {{ copy.home.joinDiscord }}
        </a>
        <a :href="X_PROFILE_URL" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300">
          {{ copy.home.followX }}
        </a>
        <a :href="GITHUB_PROFILE_URL" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-200">
          {{ copy.home.viewGithub }}
        </a>
      </div>
    </section>
  </div>
</template>

<script setup>
import PlayerCounter from "@/components/PlayerCounter.vue";
import JoinAddress from "@/components/JoinAddress.vue";
import UpdatePostCard from "@/components/UpdatePostCard.vue";
import BuildBestOfStrip from "@/components/BuildBestOfStrip.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Gamepad2, Mic, X } from "@lucide/vue";
import { onMounted, ref, watch } from "vue";
import { fatKingPreviewCopy } from "@/utils/fat-king-preview";
import { nomadPreviewCopy } from "@/utils/nomad-preview";
import { mapCatalog } from "@/utils/map-catalog";
import { featuredEvent } from "@/utils/updates";
import { COOKIE_BUILD_SITE_URL } from "@/utils/game-landings";
import { localizedAbsoluteUrl } from "@/utils/site-locales";
import { seasonalUpdatePath } from "@/utils/seasonal-theme";
import { seasonalCopy } from "@/utils/seasonal-copy";
import {
  BEDROCK_ADD_SERVER_URL,
  BEDROCK_PORT,
  DISCORD_INVITE_URL,
  GITHUB_PROFILE_URL,
  SERVER_ADDRESS,
  SOCIAL_PROFILE_URLS,
  X_PROFILE_URL,
} from "@/utils/site-links";

definePageMeta({ alias: ["/fr", "/de", "/it", "/bg", "/es", "/hi", "/pt-br"] });

const showJoinGuide = ref(false);
const selectedEdition = ref("java");
const shopAnalytics = useShopAnalytics();
const siteAnalytics = useSiteAnalytics();
const { copyToClipboard } = useCopyToast();
const { locale, copy, localizePath } = useSiteLocale();
// Seasonal skin (e.g. Halloween): decided once at SSR, nothing changes outside the window.
const { theme: seasonalTheme } = useSeasonalTheme();
const halloween = computed(() => seasonalTheme.value === "halloween");
const christmas = computed(() => seasonalTheme.value === "christmas");
// Per-season hero ring and banner look; the banner text comes from utils/seasonal-copy.
const SEASONAL_STYLE = {
  halloween: {
    hero: "halloween-hero ring-1 ring-orange-500/40",
    icon: "🎃",
    banner: "border-orange-400/50 bg-gradient-to-r from-purple-950/85 via-zinc-950/85 to-orange-950/85 shadow-[0_0_40px_rgba(147,51,234,.25)] hover:border-orange-300 focus-visible:ring-orange-400",
    accent: "text-orange-300",
    cta: "text-orange-300 group-hover:text-orange-200",
  },
  christmas: {
    hero: "christmas-hero ring-1 ring-sky-200/30",
    icon: "🎄",
    banner: "border-amber-200/50 bg-gradient-to-r from-sky-950/85 via-slate-950/85 to-red-950/80 shadow-[0_0_40px_rgba(251,191,36,.18)] hover:border-amber-100 focus-visible:ring-amber-200",
    accent: "text-sky-200",
    cta: "text-amber-200 group-hover:text-amber-100",
  },
};
const seasonalHeroClass = computed(() => (seasonalTheme.value ? SEASONAL_STYLE[seasonalTheme.value].hero : ""));
const seasonal = computed(() => seasonalTheme.value
  ? {
      ...seasonalCopy(seasonalTheme.value, locale.value.code),
      href: localizePath(seasonalUpdatePath(seasonalTheme.value)),
      style: SEASONAL_STYLE[seasonalTheme.value],
    }
  : null);
const HALLOWEEN_BATS = [
  { id: "moon", class: "w-10 md:w-14 right-[9%] top-12 md:right-[12%] md:top-20", style: { animationDelay: "-0.4s" } },
  { id: "left", class: "w-9 md:w-12 left-[6%] top-[18%]", style: { animationDelay: "-1.3s" } },
  { id: "far", class: "hidden w-7 md:block left-[20%] top-[7%]", style: { animationDelay: "-2.1s" } },
];
const HALLOWEEN_PUMPKINS = [
  { id: "left", class: "left-[3%] w-12 md:w-16", style: { animationDelay: "-0.6s" } },
  { id: "left-small", class: "left-[13%] hidden w-9 sm:block md:w-11", style: { animationDelay: "-1.7s" } },
  { id: "right", class: "right-[4%] w-11 md:w-14", style: { animationDelay: "-1.1s" } },
];
// Bulbs along the four swags of the light string (y = 8 + 44·t·(1-t) in a 400×40 box).
const CHRISTMAS_BULB_COLORS = ["bg-amber-300", "bg-red-400", "bg-emerald-400", "bg-amber-50"];
const CHRISTMAS_LIGHTS = Array.from({ length: 20 }, (_, index) => {
  const t = [0.1, 0.3, 0.5, 0.7, 0.9][index % 5];
  const x = Math.floor(index / 5) * 100 + t * 100;
  const y = 8 + 44 * t * (1 - t);
  return {
    id: index,
    class: [CHRISTMAS_BULB_COLORS[index % 4], index % 2 ? "hidden sm:block" : ""],
    style: { left: `calc(${x / 4}% - 3px)`, top: `calc(${(y / 40) * 100}% - 1px)`, animationDelay: `${(index % 7) * -0.45}s` },
  };
});
const CHRISTMAS_FLAKES = [
  { id: "left", class: "left-[6%] top-[16%] w-7 md:w-10", style: { animationDelay: "-2s" } },
  { id: "right", class: "right-[7%] top-[12%] w-9 md:w-14", style: { animationDelay: "-7s" } },
  { id: "far", class: "hidden md:block right-[22%] top-[30%] w-6", style: { animationDelay: "-11s" } },
];
const editions = computed(() => [
  { id: "java", label: "Java" },
  { id: "bedrock", label: "Bedrock" },
  { id: "console", label: copy.value.home.consoleEdition },
]);
const consoles = [
  { path: "/join/playstation", label: "PlayStation" },
  { path: "/join/xbox", label: "Xbox" },
  { path: "/join/switch", label: "Nintendo Switch" },
];

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
// Next community session (e.g. the recurring Soirée Cookie), localized for the page.
const { data: eventsData } = await useFetch("/api/mobile/v1/events", {
  query: computed(() => ({ limit: 10, locale: locale.value.code })),
});
const nextEvent = computed(() => featuredEvent(eventsData.value?.data ?? []));

const peakPlayers = computed(() => new Intl.NumberFormat(locale.value.htmlLang).format(2000));

const featureIcons = ["/unique-games-icon.svg", "/community-icon.svg", "/java-support-icon.svg"];
const features = computed(() => copy.value.home.features.map((feature, index) => ({
  ...feature,
  icon: featureIcons[index],
})));

const gallerySlugs = ["fat-king-crown", "nomad-oasis", "bedwars-cookie-colosseum-v1", "skywars-legacy-1", "microbattles-game-1", "pitchout-frozen"];
const gallery = computed(() => gallerySlugs
  .map((slug) => mapCatalog.find((map) => map.slug === slug))
  .filter(Boolean)
  .map((map) => ({
    slug: map.slug,
    name: map.name,
    game: map.game,
    image: map.image,
    alt: copy.value.home.galleryAlt.replace("{game}", map.game).replace("{name}", map.name),
  })));

const minigames = computed(() => [
  {
    name: "Fat King",
    description: fatKingPreviewCopy[locale.value.code].intro,
    available: true,
    statusLabel: copy.value.common.available,
    icon: "/unique-games-icon.svg",
    new: true,
    cornerLabel: copy.value.common.beta,
    href: localizePath("/fat-king"),
  },
  {
    name: "Nomad Wars",
    description: nomadPreviewCopy[locale.value.code].intro,
    available: true,
    statusLabel: copy.value.common.available,
    icon: "/skywars-icon.svg",
    new: true,
    cornerLabel: copy.value.common.beta,
    href: localizePath("/nomad-wars"),
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
    href: localizePath("/turfwars"),
  },
]);

const faqs = computed(() => copy.value.home.faqs);

const copyText = async (value, label) => {
  await copyToClipboard(value, label);
  if (value === SERVER_ADDRESS) siteAnalytics.track("server_address_copy");
};

const organizationId = `${COOKIE_BUILD_SITE_URL}/#organization`;

useHead(() => ({
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": organizationId,
            name: "Cookie Build",
            url: `${COOKIE_BUILD_SITE_URL}/`,
            logo: {
              "@type": "ImageObject",
              url: `${COOKIE_BUILD_SITE_URL}/android-chrome-512x512.png`,
              width: 512,
              height: 512,
            },
            foundingDate: "2014",
            email: "support@cookie-build.com",
            sameAs: [...SOCIAL_PROFILE_URLS],
          },
          {
            "@type": "WebSite",
            "@id": `${COOKIE_BUILD_SITE_URL}/#website`,
            name: "Cookie Build",
            url: localizedAbsoluteUrl("/", locale.value),
            inLanguage: locale.value.htmlLang,
            publisher: { "@id": organizationId },
          },
          {
            "@type": "VideoGame",
            name: "Cookie Build",
            description: copy.value.home.description,
            inLanguage: locale.value.htmlLang,
            genre: ["Multiplayer", "Mini-games", "Action"],
            gamePlatform: ["PC", "Mobile", "Console"],
            applicationCategory: "Game",
            operatingSystem: "Windows, macOS, Linux, iOS, Android, Xbox, PlayStation, Switch",
            url: canonicalUrl.value,
            image: `${COOKIE_BUILD_SITE_URL}/lobby-hero-clean-1600.webp`,
            author: { "@id": organizationId },
            publisher: { "@id": organizationId },
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
              category: "Free",
            },
          },
          {
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
        ],
      }),
    },
  ],
}));
</script>

<style scoped>
.halloween-hero { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, .25), 0 0 60px rgba(147, 51, 234, .22); }
.halloween-moon {
  background: radial-gradient(circle at 38% 35%, #fffbeb 0%, #fde68a 48%, #f59e0b 100%);
  box-shadow: 0 0 40px 8px rgba(253, 230, 138, .3), 0 0 90px 20px rgba(249, 115, 22, .18);
  opacity: .9;
}
.halloween-bat {
  color: #0c0a09;
  filter: drop-shadow(0 0 5px rgba(249, 115, 22, .55));
  transform-origin: 50% 40%;
  animation: halloween-bat-flap .5s ease-in-out infinite alternate, halloween-bat-drift 7s ease-in-out infinite;
}
.halloween-pumpkin { filter: drop-shadow(0 0 12px rgba(249, 115, 22, .55)); }
.halloween-pumpkin-face { animation: halloween-flicker 2.6s ease-in-out infinite; animation-delay: inherit; }
@keyframes halloween-bat-flap { from { transform: scaleY(1); } to { transform: scaleY(.55); } }
@keyframes halloween-bat-drift { 0%, 100% { translate: 0 0; } 50% { translate: 14px -10px; } }
@keyframes halloween-flicker { 0%, 100% { opacity: 1; } 40% { opacity: .75; } 45% { opacity: .95; } 70% { opacity: .65; } }
.christmas-hero { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, .25), 0 0 60px rgba(186, 230, 253, .16); }
.christmas-glow { background: radial-gradient(ellipse at 50% 100%, rgba(251, 191, 36, .22), transparent 70%); }
.christmas-snow { background-repeat: repeat; animation: christmas-snowfall linear infinite; }
.christmas-snow-near {
  background-image:
    radial-gradient(2px 2px at 20px 30px, #fff 50%, transparent 51%),
    radial-gradient(2.5px 2.5px at 90px 130px, rgba(255, 255, 255, .9) 50%, transparent 51%),
    radial-gradient(3px 3px at 160px 70px, rgba(255, 255, 255, .85) 50%, transparent 51%),
    radial-gradient(2px 2px at 220px 180px, #fff 50%, transparent 51%),
    radial-gradient(2.5px 2.5px at 270px 100px, rgba(255, 255, 255, .9) 50%, transparent 51%);
  background-size: 300px 220px;
  --snow-drift: 40px;
  --snow-fall: 220px;
  animation-duration: 12s;
}
.christmas-snow-far {
  background-image:
    radial-gradient(1.5px 1.5px at 30px 50px, rgba(255, 255, 255, .7) 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 110px 20px, rgba(255, 255, 255, .6) 50%, transparent 51%),
    radial-gradient(1px 1px at 150px 120px, rgba(255, 255, 255, .7) 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 60px 140px, rgba(255, 255, 255, .5) 50%, transparent 51%);
  background-size: 180px 160px;
  --snow-drift: -20px;
  --snow-fall: 160px;
  animation-duration: 20s;
}
@keyframes christmas-snowfall { from { background-position: 0 0; } to { background-position: var(--snow-drift) var(--snow-fall); } }
.christmas-bulb { box-shadow: 0 0 6px 2px currentColor; color: rgba(253, 230, 138, .55); animation: christmas-twinkle 3.2s ease-in-out infinite; }
.christmas-flake { animation: christmas-flake-spin 18s linear infinite; filter: drop-shadow(0 0 6px rgba(186, 230, 253, .45)); }
.christmas-snowman { filter: drop-shadow(0 0 10px rgba(251, 191, 36, .25)); }
@keyframes christmas-twinkle { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
@keyframes christmas-flake-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .halloween-bat, .halloween-pumpkin-face { animation: none; }
  .christmas-snow, .christmas-bulb, .christmas-flake { animation: none; }
}
</style>
