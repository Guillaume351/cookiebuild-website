<template>
  <main class="container mx-auto max-w-3xl px-4 py-16 text-gray-100">
    <h1 class="mb-6 text-4xl font-bold">Delete your Cookie Build app account</h1>
    <div class="space-y-5 rounded-xl border border-gray-700 bg-gray-900 p-6 text-gray-300">
      <p>
        You can permanently delete your account from the Cookie Build mobile app under
        <strong>Settings → Account → Delete account</strong>. Deletion removes your profile,
        notification devices, preferences, and Minecraft player links.
      </p>
      <p>
        Match results and aggregate gameplay statistics remain attached to the Minecraft player,
        not the deleted mobile account. They are part of the server's public leaderboards and game
        integrity records.
      </p>
      <p>
        If you cannot access the app, email support from the address used for your account. Include
        your Minecraft name and whether you play Java or Bedrock so we can verify and complete the
        request.
      </p>
      <a
        class="inline-flex rounded-md bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-400"
        href="mailto:support@cookie-build.com?subject=Cookie%20Build%20account%20deletion%20request"
      >
        Request account deletion
      </a>
    </div>
  </main>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "Delete your account | Cookie Build",
  description: "Delete your Cookie Build mobile app account and associated personal data.",
  robots: "index, follow",
});
</script>
