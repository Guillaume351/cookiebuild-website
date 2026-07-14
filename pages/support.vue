<template>
  <main class="mx-auto max-w-3xl space-y-8 py-12 text-gray-300">
    <header>
      <h1 class="mb-3 text-4xl font-bold text-white">Cookie Build Support</h1>
      <p lang="fr">Assistance Cookie Build · English and French support</p>
    </header>

    <section class="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 class="mb-3 text-2xl font-semibold text-white">Contact · Contact</h2>
      <p>
        Email
        <a class="font-semibold text-orange-400" href="mailto:support@cookie-build.com?subject=Cookie%20Build%20support">
          support@cookie-build.com
        </a>.
        Include your Minecraft name, Java or Bedrock edition, app version, device model, and a short
        description. Do not send passwords, one-time link codes, or private keys.
      </p>
      <p class="mt-3" lang="fr">
        Indiquez votre pseudo Minecraft, l’édition Java ou Bedrock, la version de l’app, le modèle
        d’appareil et une brève description. N’envoyez jamais de mot de passe ni de code temporaire.
      </p>
    </section>

    <section>
      <h2 class="mb-3 text-2xl font-semibold text-white">Quick help · Aide rapide</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <article class="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 class="font-bold text-white">Connect to the server</h3>
          <p class="mt-2">Java: <strong>play.cookie-build.com</strong></p>
          <p>Bedrock: <strong>play.cookie-build.com:19132</strong></p>
        </article>
        <article class="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 class="font-bold text-white">Link the app</h3>
          <p class="mt-2">Join Cookie Build, run <code>/app link</code>, then enter the eight-character code in the app within 10 minutes.</p>
        </article>
        <article class="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 class="font-bold text-white">Notifications</h3>
          <p class="mt-2">They stay off until you enable them in the app. Disable them at any time in Profile.</p>
        </article>
        <article class="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 class="font-bold text-white">Friends and parties</h3>
          <p class="mt-2">Link a player, use an exact Minecraft name, and pull to refresh. Parties support up to four players.</p>
        </article>
      </div>
    </section>

    <section class="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 class="mb-3 text-2xl font-semibold text-white">Privacy and account controls</h2>
      <div class="flex flex-wrap gap-3">
        <NuxtLink class="rounded-md bg-orange-600 px-4 py-2 font-semibold text-white" to="/privacy">Privacy policy</NuxtLink>
        <NuxtLink class="rounded-md border border-gray-700 px-4 py-2 font-semibold text-white" to="/account/delete">Delete account</NuxtLink>
        <NuxtLink class="rounded-md border border-gray-700 px-4 py-2 font-semibold text-white" to="/terms">Terms</NuxtLink>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "Support | Cookie Build",
  description: "Cookie Build mobile app and Minecraft server support in English and French.",
  robots: "index, follow",
});
</script>
