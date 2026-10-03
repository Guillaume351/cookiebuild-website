<template>
  <div ref="root" class="relative h-full w-full overflow-hidden bg-stone-900" :class="fullscreen ? 'rounded-none' : ''">
    <div
      ref="stage"
      class="absolute inset-0 outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-orange-400"
      :class="state === 'ready' ? 'cursor-grab active:cursor-grabbing' : ''"
      :tabindex="state === 'ready' ? 0 : -1"
      role="application"
      :aria-label="copy.viewer.label(theme, playerName)"
      :aria-describedby="helpId"
      @keydown="onKeydown"
    />

    <!-- Loading / fallback layers -->
    <div v-if="state !== 'ready'" class="absolute inset-0">
      <img
        v-if="ogImageUrl"
        :src="ogImageUrl"
        :alt="state === 'nowebgl' ? copy.cardAlt(theme, playerName) : ''"
        class="h-full w-full object-cover"
        :class="state === 'nowebgl' ? '' : 'scale-105 opacity-40 blur-sm'"
      />
      <div class="absolute inset-0 flex items-center justify-center p-6" :class="state === 'nowebgl' ? 'items-end' : ''">
        <p v-if="state === 'loading'" role="status" class="flex items-center gap-3 rounded-xl bg-black/70 px-4 py-3 text-sm font-bold text-white">
          <LoaderCircle class="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {{ copy.viewer.loading }}
        </p>
        <div v-else-if="state === 'error'" role="alert" class="flex flex-col items-center gap-3 rounded-xl bg-black/75 px-5 py-4 text-center text-sm text-white">
          <p class="font-bold">{{ copy.viewer.error }}</p>
          <button type="button" class="min-h-11 rounded-lg bg-orange-600 px-4 font-bold hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" @click="load">
            {{ copy.retry }}
          </button>
        </div>
        <p v-else-if="state === 'nowebgl'" role="status" class="rounded-xl bg-black/75 px-4 py-3 text-sm text-white">{{ copy.viewer.webglFallback }}</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div v-if="state === 'ready'" class="absolute right-3 top-3 flex gap-2" role="toolbar" :aria-label="copy.viewer.label(theme, playerName)">
      <button
        v-for="action in actions"
        :key="action.id"
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 motion-reduce:transition-none"
        :aria-label="action.label"
        :title="action.label"
        :aria-pressed="action.pressed"
        @click="action.run"
      >
        <component :is="action.icon" class="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
    <p :id="helpId" class="pointer-events-none absolute bottom-2 left-3 right-3 text-xs text-white/70" :class="state === 'ready' && !embed ? '' : 'sr-only'">
      {{ copy.viewer.keyboardHelp }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { Camera, LoaderCircle, Maximize, Minimize, Pause, Play, RotateCcw } from "@lucide/vue";
import { decodeBuildPayload } from "@/utils/build-gallery";
import type { BuildViewerHandle } from "@/utils/build-viewer-scene";

const props = withDefaults(defineProps<{
  shortCode: string;
  theme: string;
  playerName: string;
  ogImageUrl?: string;
  embed?: boolean;
}>(), { ogImageUrl: "", embed: false });

const { copy } = useBuildGalleryCopy();
const api = useBuildApi();
const helpId = `build-viewer-help-${useId()}`;

const root = ref<HTMLElement | null>(null);
const stage = ref<HTMLElement | null>(null);
const state = ref<"loading" | "ready" | "error" | "nowebgl">("loading");
const autoRotate = ref(true);
const fullscreen = ref(false);
const canFullscreen = ref(false);
let handle: BuildViewerHandle | null = null;
let reducedMotion = false;
let disposed = false;

async function load() {
  state.value = "loading";
  handle?.dispose();
  handle = null;
  try {
    const [sceneModule, payload] = await Promise.all([
      import("@/utils/build-viewer-scene"),
      api.blocks(props.shortCode),
    ]);
    const build = decodeBuildPayload(payload);
    const textures = await sceneModule.loadTextureIndex();
    if (disposed || !stage.value) return;
    handle = await sceneModule.createBuildViewerScene({
      container: stage.value,
      build,
      textures,
      reducedMotion,
      onInteract: () => { autoRotate.value = false; },
    });
    if (disposed) {
      handle.dispose();
      return;
    }
    autoRotate.value = !reducedMotion;
    state.value = "ready";
  } catch (error) {
    if ((error as Error)?.name === "WebGLUnavailableError") {
      state.value = "nowebgl";
      return;
    }
    console.error("[build-viewer]", error);
    state.value = "error";
  }
}

function toggleRotation() {
  autoRotate.value = !autoRotate.value;
  handle?.setAutoRotate(autoRotate.value);
}

async function screenshot() {
  const blob = await handle?.screenshot();
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cookie-build-${props.shortCode}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

async function toggleFullscreen() {
  if (!root.value) return;
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
  else await root.value.requestFullscreen?.().catch(() => {});
}

function onFullscreenChange() {
  fullscreen.value = document.fullscreenElement === root.value;
}

const STEP = Math.PI / 12;
function onKeydown(event: KeyboardEvent) {
  if (!handle) return;
  const keys: Record<string, () => void> = {
    ArrowLeft: () => handle!.rotateBy(-STEP, 0),
    ArrowRight: () => handle!.rotateBy(STEP, 0),
    ArrowUp: () => handle!.rotateBy(0, -STEP / 2),
    ArrowDown: () => handle!.rotateBy(0, STEP / 2),
    "+": () => handle!.zoomBy(0.85),
    "=": () => handle!.zoomBy(0.85),
    "-": () => handle!.zoomBy(1.18),
    "0": () => handle!.resetView(),
    Home: () => handle!.resetView(),
  };
  const run = keys[event.key];
  if (!run) return;
  event.preventDefault();
  if (event.key.startsWith("Arrow")) autoRotate.value = false;
  run();
}

const actions = computed(() => [
  { id: "rotate", label: autoRotate.value ? copy.value.viewer.pause : copy.value.viewer.play, icon: autoRotate.value ? Pause : Play, pressed: autoRotate.value, run: toggleRotation },
  { id: "reset", label: copy.value.viewer.reset, icon: RotateCcw, pressed: undefined, run: () => handle?.resetView() },
  { id: "screenshot", label: copy.value.viewer.screenshot, icon: Camera, pressed: undefined, run: screenshot },
  ...(canFullscreen.value
    ? [{ id: "fullscreen", label: fullscreen.value ? copy.value.viewer.exitFullscreen : copy.value.viewer.fullscreen, icon: fullscreen.value ? Minimize : Maximize, pressed: undefined, run: toggleFullscreen }]
    : []),
]);

onMounted(() => {
  reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  canFullscreen.value = Boolean(document.fullscreenEnabled && root.value?.requestFullscreen);
  document.addEventListener("fullscreenchange", onFullscreenChange);
  load();
});

watch(() => props.shortCode, () => load());

onBeforeUnmount(() => {
  disposed = true;
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  handle?.dispose();
  handle = null;
});
</script>
