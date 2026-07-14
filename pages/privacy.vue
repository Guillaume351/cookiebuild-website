<template>
  <article class="mx-auto max-w-3xl space-y-8 py-12 text-gray-300">
    <header>
      <h1 class="mb-3 text-4xl font-bold text-white">Privacy Policy</h1>
      <p>Last updated: July 14, 2026</p>
    </header>

    <section>
      <h2 class="mb-3 text-2xl font-semibold text-white">Information we process</h2>
      <p>
        The Cookie Build app processes your Firebase account identifier and, when provided by your
        sign-in method, your email address, display name, and profile image. If you link Minecraft,
        we store the player UUID, player name, Java or Bedrock edition, and link history. Gameplay
        results, progression, and leaderboard statistics are produced by the Minecraft server.
      </p>
      <p class="mt-3">
        For notifications we store an app installation identifier, Firebase Cloud Messaging token,
        platform, app version, locale, timezone, authorization state, and notification preferences.
        Security systems may temporarily process an IP address to rate-limit link-code attempts.
      </p>
    </section>

    <section>
      <h2 class="mb-3 text-2xl font-semibold text-white">How we use information</h2>
      <p>
        We use this information to authenticate the app, link the correct Minecraft player, show
        statistics and events, deliver requested notifications, protect accounts, operate and debug
        the service, enforce server rules, and answer support requests. We do not sell personal data.
      </p>
    </section>

    <section>
      <h2 class="mb-3 text-2xl font-semibold text-white">Service providers and visibility</h2>
      <p>
        Firebase provides authentication and push-notification delivery. Apple and Google process
        app distribution under their own policies. Minecraft player names and gameplay statistics
        may appear publicly in leaderboards; account contact details and notification tokens do not.
      </p>
    </section>

    <section>
      <h2 class="mb-3 text-2xl font-semibold text-white">Retention and deletion</h2>
      <p>
        Mobile profile and notification data is retained while your account is active. Deleting the
        app account removes profile fields, notification devices, preferences, and mobile player
        links. When Firebase confirms identity deletion, the original Firebase identifier is
        replaced with an internal deleted-account marker. A one-way hash of the identifier is
        retained as a deletion tombstone so an old token cannot recreate the account. Gameplay and
        moderation records may remain where needed for leaderboards, game integrity, security, and
        rule enforcement.
      </p>
      <p class="mt-3">
        Use the in-app deletion control or visit
        <NuxtLink class="text-orange-400 hover:text-orange-300" to="/account/delete">
          the account-deletion page
        </NuxtLink>.
      </p>
    </section>

    <section>
      <h2 class="mb-3 text-2xl font-semibold text-white">Contact</h2>
      <p>
        For privacy questions or requests, email
        <a class="text-orange-400 hover:text-orange-300" href="mailto:support@cookie-build.com">
          support@cookie-build.com
        </a>.
      </p>
    </section>
  </article>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "Privacy Policy | Cookie Build",
  description: "How the Cookie Build Minecraft server and mobile app process personal data.",
  robots: "index, follow",
});
</script>
