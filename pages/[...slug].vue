<template>
  <main class="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center py-16 text-center">
    <p class="text-sm font-black uppercase tracking-[0.3em] text-orange-400">404</p>
    <h1 class="mt-4 text-4xl font-black text-white md:text-5xl">{{ errorCopy.title }}</h1>
    <p class="mt-5 max-w-xl text-lg text-zinc-400">
      {{ errorCopy.description }}
    </p>
    <div class="mt-8 flex flex-wrap justify-center gap-3">
      <NuxtLink class="rounded-lg bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700" :to="localizePath('/')">{{ copy.navigation.home }}</NuxtLink>
      <NuxtLink class="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-3 font-bold text-white hover:bg-zinc-800" :to="localizePath('/status')">{{ copy.footer.serverStatus }}</NuxtLink>
      <NuxtLink class="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-3 font-bold text-white hover:bg-zinc-800" :to="localizePath('/support')">{{ copy.footer.support }}</NuxtLink>
    </div>
  </main>
</template>

<script setup lang="ts">
const { locale, copy, localizePath } = useSiteLocale();
const errorCopies = {
  "en": {
    "title": "This page could not be found",
    "description": "The address may be old or incomplete. The Minecraft network and account data are not affected."
  },
  "fr": {
    "title": "Cette page est introuvable",
    "description": "L’adresse est peut-être ancienne ou incomplète. Le réseau Minecraft et les données de votre compte ne sont pas affectés."
  },
  "de": {
    "title": "Diese Seite wurde nicht gefunden",
    "description": "Die Adresse ist möglicherweise veraltet oder unvollständig. Das Minecraft-Netzwerk und deine Kontodaten sind nicht betroffen."
  },
  "it": {
    "title": "Pagina non trovata",
    "description": "L’indirizzo potrebbe essere vecchio o incompleto. La rete Minecraft e i dati del tuo account non sono interessati."
  },
  "bg": {
    "title": "Страницата не е намерена",
    "description": "Адресът може да е стар или непълен. Minecraft мрежата и данните на акаунта ти не са засегнати."
  },
  "es": {
    "title": "No se encontró esta página",
    "description": "La dirección puede ser antigua o estar incompleta. La red de Minecraft y los datos de tu cuenta no se ven afectados."
  },
  "hi": {
    "title": "यह पेज नहीं मिला",
    "description": "पता पुराना या अधूरा हो सकता है। Minecraft नेटवर्क और आपके खाते का डेटा प्रभावित नहीं है।"
  },
  "pt-BR": {
    "title": "Esta página não foi encontrada",
    "description": "O endereço pode ser antigo ou incompleto. A rede Minecraft e os dados da sua conta não foram afetados."
  }
};
const errorCopy = computed(() => errorCopies[locale.value.code]);
const event = useRequestEvent();
if (event) setResponseStatus(event, 404);

useSeoMeta({
  title: () => `${errorCopy.value.title} | Cookie Build`,
  description: () => errorCopy.value.description,
  robots: "noindex, nofollow",
});
</script>
