<template>
  <section class="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-7 sm:p-9">
    <h2 class="text-2xl font-black text-white">{{ french ? 'Jouer avec tes amis' : 'Play with friends' }}</h2>
    <p class="mt-4 leading-relaxed text-zinc-300">{{ french ? 'Connecte-toi à Cookie Build, puis saisis la commande dans le chat ou choisis le mode dans le menu des jeux.' : 'Connect to Cookie Build, then enter the command in chat or choose the mode in the game menu.' }}</p>
    <dl class="mt-5 flex flex-wrap gap-x-10 gap-y-5">
      <div><dt class="text-sm text-zinc-400">Java</dt><dd class="mt-1 font-mono font-bold text-white">play.cookie-build.com</dd></div>
      <div><dt class="text-sm text-zinc-400">Bedrock</dt><dd class="mt-1 font-mono font-bold text-white">play.cookie-build.com · 19132</dd></div>
      <div><dt class="text-sm text-zinc-400">{{ french ? 'Rejoindre' : 'Join' }}</dt><dd class="mt-1 font-mono font-bold text-emerald-300">{{ command }}</dd></div>
    </dl>
    <p class="mt-5 text-sm text-zinc-400">{{ french ? 'Pour quitter la file ou la partie : /leave. Retrouvez-vous dans le même mode avant le début du compte à rebours.' : 'Leave the queue or match with /leave. Join the same mode before the countdown starts.' }}</p>
  </section>
</template>
<script setup lang="ts">
defineProps<{ command: string; french: boolean }>();
</script>
