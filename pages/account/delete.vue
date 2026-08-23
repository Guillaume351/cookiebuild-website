<template>
  <main class="container mx-auto max-w-3xl px-4 py-16 text-gray-100">
    <LanguageFallbackNotice :available-locales="['en', 'fr']" />
    <h1 class="mb-3 text-4xl font-bold">Delete your Cookie Build app account</h1>
    <p class="mb-8 text-gray-400" lang="fr">Supprimer votre compte de l’application Cookie Build</p>

    <div class="space-y-6 rounded-xl border border-gray-700 bg-gray-900 p-6 text-gray-300">
      <section>
        <h2 class="mb-2 text-xl font-bold text-white">Fastest option · Option la plus simple</h2>
        <p>
          In the app, open <strong>Settings → Your data → Delete account and data</strong>. The
          mobile profile, notification devices, preferences, and app links are removed immediately;
          Firebase identity deletion may finish asynchronously if its provider is temporarily unavailable.
        </p>
        <p class="mt-2" lang="fr">
          Dans l’app : <strong>Réglages → Tes données → Supprimer le compte et les données</strong>.
        </p>
      </section>

      <hr class="border-gray-700" />

      <section>
        <h2 class="mb-2 text-xl font-bold text-white">Delete without the app · Supprimer sans l’app</h2>
        <ol class="list-decimal space-y-2 pl-5">
          <li>Join <strong>play.cookie-build.com</strong> with the Minecraft player linked to the app.</li>
          <li>Run <code class="rounded bg-black/40 px-2 py-1">/app link</code>.</li>
          <li>Enter the eight-character code below within 10 minutes.</li>
        </ol>
        <p class="mt-3" lang="fr">
          Rejoignez le serveur avec le joueur associé, exécutez <code>/app link</code>, puis saisissez
          le code de huit caractères ci-dessous dans les 10 minutes.
        </p>

        <form class="mt-5 space-y-4" @submit.prevent="deleteByCode">
          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-white">One-time code · Code temporaire</span>
            <input
              v-model="code"
              class="w-full rounded-lg border border-gray-600 bg-gray-950 px-4 py-3 text-center font-mono text-xl font-bold uppercase tracking-[0.3em] text-white outline-none focus:border-orange-500"
              inputmode="text"
              maxlength="8"
              autocomplete="one-time-code"
              placeholder="AB23CD45"
              :disabled="submitting || deleted"
              @input="normalizeCode"
            />
          </label>
          <label class="flex items-start gap-3 text-sm">
            <input v-model="confirmed" class="mt-1" type="checkbox" :disabled="submitting || deleted" />
            <span>
              I understand that this permanently deletes the mobile account and all of its player
              links. / Je comprends que le compte mobile et toutes ses associations seront supprimés.
            </span>
          </label>
          <button
            type="submit"
            class="w-full rounded-md bg-red-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="code.length !== 8 || !confirmed || submitting || deleted"
          >
            {{ submitting ? "Deleting…" : deleted ? "Account deleted" : "Delete mobile account" }}
          </button>
        </form>

        <p v-if="message" class="mt-4 rounded-lg p-3" :class="deleted ? 'bg-green-950 text-green-200' : 'bg-red-950 text-red-200'" role="status">
          {{ message }}
        </p>
      </section>

      <hr class="border-gray-700" />

      <section>
        <h2 class="mb-2 text-xl font-bold text-white">What remains · Données conservées</h2>
        <p>
          Minecraft names, match results, aggregate gameplay statistics, and social-safety records
          remain attached to the Minecraft player for leaderboard, fair-play, and moderation integrity.
          They are not part of the deleted anonymous mobile identity. See the
          <NuxtLink class="text-orange-400" to="/privacy">Privacy Policy</NuxtLink> for exact periods and rights.
        </p>
        <p class="mt-3">
          If the in-game verification flow is inaccessible, contact
          <a class="text-orange-400" href="mailto:support@cookie-build.com?subject=Cookie%20Build%20account%20deletion%20help">support@cookie-build.com</a>.
          Support will request a safe proof of player control and will never ask for a password.
        </p>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ alias: ["/fr/account/delete", "/de/account/delete", "/it/account/delete", "/bg/account/delete", "/es/account/delete", "/hi/account/delete", "/pt-br/account/delete"] });

const code = ref("");
const confirmed = ref(false);
const submitting = ref(false);
const deleted = ref(false);
const message = ref("");

function normalizeCode() {
  code.value = code.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 8);
}

async function deleteByCode() {
  if (code.value.length !== 8 || !confirmed.value || submitting.value) return;
  submitting.value = true;
  message.value = "";
  try {
    const response = await $fetch<{ data: { deleted: boolean; identityDeletionPending: boolean } }>(
      "/api/mobile/v1/account/delete-by-link-code",
      { method: "POST", body: { code: code.value } },
    );
    deleted.value = response.data.deleted;
    message.value = response.data.identityDeletionPending
      ? "The account is disabled and Firebase identity cleanup is queued. / Le compte est désactivé et la suppression Firebase est en attente."
      : "The mobile account has been deleted. / Le compte mobile a été supprimé.";
    code.value = "";
  } catch (error) {
    const statusMessage = typeof error === "object" && error !== null && "statusMessage" in error
      ? String(error.statusMessage)
      : "Invalid, expired, or already used code.";
    message.value = `${statusMessage} / Code invalide, expiré ou déjà utilisé.`;
  } finally {
    submitting.value = false;
  }
}

useLocalizedSeo(
  "/account/delete",
  "Delete your account | Cookie Build",
  "Delete the Cookie Build mobile account in-app or with a verified one-time Minecraft code.",
);
</script>
