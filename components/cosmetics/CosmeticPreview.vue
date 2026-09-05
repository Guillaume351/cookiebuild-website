<template>
  <div
    class="preview-stage relative isolate flex h-52 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-950"
    :aria-label="`Aperçu animé : ${item.name}`"
    role="img"
  >
    <div class="absolute inset-x-0 bottom-0 h-16 border-t border-orange-200/10 bg-[linear-gradient(135deg,rgba(120,53,15,.2)_25%,transparent_25%,transparent_50%,rgba(120,53,15,.2)_50%,rgba(120,53,15,.2)_75%,transparent_75%)] bg-[length:28px_28px]" />

    <div v-if="item.preview.kind === 'badge'" class="relative z-10 flex flex-col items-center gap-4">
      <div class="grid h-20 w-20 place-items-center rounded-2xl border-2 border-amber-400 bg-orange-950 text-3xl shadow-[0_0_32px_rgba(251,191,36,.2)]">🍪</div>
      <span class="rounded-md border border-amber-300/70 bg-amber-400/10 px-3 py-1 font-mono text-sm font-black tracking-[0.14em] text-amber-200">[SUPPORTER]</span>
    </div>

    <div v-else-if="item.preview.kind === 'trail'" class="relative z-10 h-28 w-52">
      <span v-for="index in 7" :key="index" class="crumb absolute h-2.5 w-2.5 rounded-sm bg-amber-500" :style="crumbStyle(index)" />
      <div class="walker absolute right-7 top-5 grid h-16 w-12 place-items-center rounded-md border-2 border-orange-300 bg-orange-900 text-2xl">🍪</div>
    </div>

    <div v-else-if="item.preview.kind === 'emote'" class="relative z-10">
      <span class="cheer-cookie absolute -top-12 left-1/2 -translate-x-1/2 text-4xl">🍪</span>
      <div class="cheer-avatar grid h-20 w-16 place-items-center rounded-lg border-2 border-orange-300 bg-orange-950 text-3xl">☺</div>
      <span class="cheer-arm left-arm absolute -left-7 top-7 h-3 w-9 rounded bg-amber-600" />
      <span class="cheer-arm right-arm absolute -right-7 top-7 h-3 w-9 rounded bg-amber-600" />
    </div>

    <div v-else-if="item.preview.kind === 'burst'" class="relative z-10 grid h-32 w-32 place-items-center">
      <span v-for="index in 12" :key="index" class="burst-particle absolute h-3 w-3 rounded-sm bg-amber-300" :style="particleStyle(index)" />
      <span class="victory-cookie text-6xl drop-shadow-[0_0_18px_rgba(251,191,36,.8)]">🍪</span>
    </div>

    <div v-else-if="item.preview.kind === 'flight'" class="flight-avatar relative z-10 grid h-20 w-16 place-items-center rounded-lg border-2 border-sky-200 bg-sky-950 text-3xl shadow-[0_0_30px_rgba(125,211,252,.3)]">
      🍪
      <span class="absolute -left-9 top-7 text-3xl text-sky-200" aria-hidden="true">≋</span>
      <span class="absolute -right-9 top-7 text-3xl text-sky-200" aria-hidden="true">≋</span>
      <span class="absolute -bottom-9 whitespace-nowrap rounded bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-200">Lobby uniquement</span>
    </div>

    <div v-else-if="item.preview.kind === 'join-flair'" class="relative z-10 grid h-32 w-32 place-items-center">
      <span v-for="index in 6" :key="index" class="join-particle absolute h-2 w-8 rounded-full bg-yellow-100 shadow-[0_0_14px_rgba(254,249,195,.9)]" :style="joinParticleStyle(index)" />
      <span class="join-cookie text-6xl">🍪</span>
      <span class="absolute -bottom-1 rounded bg-black/70 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-100">Carillon local</span>
    </div>

    <div v-else class="profile-card relative z-10 w-56 rounded-2xl border-2 border-amber-400 bg-zinc-900 p-4 shadow-[0_0_36px_rgba(245,158,11,.18)]">
      <div class="flex items-center gap-3">
        <div class="grid h-14 w-14 place-items-center rounded-xl bg-orange-950 text-2xl">🍪</div>
        <div>
          <strong class="block text-white">CookiePlayer</strong>
          <span class="text-xs font-bold uppercase tracking-wider text-amber-300">Supporter</span>
        </div>
      </div>
      <div class="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800"><span class="block h-full w-2/3 bg-orange-500" /></div>
    </div>

    <span class="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Aperçu web</span>
  </div>
</template>

<script setup lang="ts">
import type { COSMETIC_CATALOG } from "#shared/cosmetics-catalog";

defineProps<{ item: (typeof COSMETIC_CATALOG)[number] }>();

function crumbStyle(index: number) {
  return {
    left: `${12 + index * 17}px`,
    top: `${78 - Math.sin(index * 1.3) * 18}px`,
    animationDelay: `${index * -0.17}s`,
    opacity: `${0.25 + index * 0.09}`,
  };
}

function particleStyle(index: number) {
  const angle = (index / 12) * Math.PI * 2;
  return {
    "--particle-x": `${Math.cos(angle) * 58}px`,
    "--particle-y": `${Math.sin(angle) * 58}px`,
    animationDelay: `${index * -0.08}s`,
  };
}

function joinParticleStyle(index: number) {
  const angle = (index / 6) * Math.PI * 2;
  return {
    transform: `translate(${Math.cos(angle) * 54}px, ${Math.sin(angle) * 45}px) rotate(${angle}rad)`,
    animationDelay: `${index * -0.12}s`,
  };
}
</script>

<style scoped>
.preview-stage { perspective: 700px; }
.crumb { animation: crumb-fade 1.8s ease-in-out infinite; }
.walker { animation: walk 1.8s ease-in-out infinite; }
.cheer-avatar { animation: cheer 1.4s ease-in-out infinite; }
.cheer-cookie { animation: cookie-pop 1.4s ease-in-out infinite; }
.cheer-arm { transform-origin: center; animation: arm-wave .7s ease-in-out infinite alternate; }
.left-arm { transform: rotate(35deg); }
.right-arm { transform: rotate(-35deg); }
.burst-particle { animation: burst 1.6s ease-out infinite; }
.victory-cookie { animation: victory 1.6s ease-in-out infinite; }
.profile-card { animation: frame-glow 2.4s ease-in-out infinite; }
.flight-avatar { animation: flight-hover 2s ease-in-out infinite; }
.join-particle { animation: join-shimmer 1.5s ease-in-out infinite; }
.join-cookie { animation: join-arrive 1.5s ease-out infinite; }

@keyframes crumb-fade { 0%, 100% { transform: scale(.6) rotate(0); opacity: .2; } 50% { transform: scale(1.1) rotate(45deg); opacity: .9; } }
@keyframes walk { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-6px) rotate(2deg); } }
@keyframes cheer { 0%, 100% { transform: translateY(0); } 45% { transform: translateY(-16px); } }
@keyframes cookie-pop { 0%, 100% { transform: translate(-50%, 14px) scale(.65) rotate(-12deg); opacity: .25; } 45% { transform: translate(-50%, -14px) scale(1.05) rotate(12deg); opacity: 1; } }
@keyframes arm-wave { from { margin-top: 0; } to { margin-top: -13px; } }
@keyframes burst { 0% { transform: translate(0, 0) scale(.2) rotate(0); opacity: 0; } 35% { opacity: 1; } 100% { transform: translate(var(--particle-x), var(--particle-y)) scale(.9) rotate(120deg); opacity: 0; } }
@keyframes victory { 0%, 100% { transform: scale(.82) rotate(-5deg); } 45% { transform: scale(1.08) rotate(5deg); } }
@keyframes frame-glow { 0%, 100% { box-shadow: 0 0 18px rgba(245,158,11,.12); } 50% { box-shadow: 0 0 42px rgba(245,158,11,.34); } }
@keyframes flight-hover { 0%, 100% { transform: translateY(8px) rotate(-2deg); } 50% { transform: translateY(-14px) rotate(2deg); } }
@keyframes join-shimmer { 0%, 100% { opacity: .2; filter: blur(1px); } 50% { opacity: 1; filter: blur(0); } }
@keyframes join-arrive { 0% { transform: scale(.65); opacity: .25; } 45%, 100% { transform: scale(1); opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .crumb, .walker, .cheer-avatar, .cheer-cookie, .cheer-arm, .burst-particle, .victory-cookie, .profile-card, .flight-avatar, .join-particle, .join-cookie { animation: none; }
}
</style>
