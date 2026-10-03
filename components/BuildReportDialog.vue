<template>
  <dialog
    ref="dialog"
    class="w-[min(92vw,28rem)] rounded-2xl border border-zinc-700 bg-zinc-950 p-0 text-white shadow-2xl backdrop:bg-black/70"
    :aria-labelledby="titleId"
    @close="emit('close')"
  >
    <form class="space-y-5 p-6" @submit.prevent="submit">
      <div>
        <h2 :id="titleId" class="text-xl font-black">{{ copy.detail.reportTitle }}</h2>
        <p class="mt-2 text-sm text-zinc-400">{{ copy.detail.reportIntro }}</p>
      </div>
      <fieldset class="space-y-2">
        <legend class="sr-only">{{ copy.detail.reportTitle }}</legend>
        <label
          v-for="option in BUILD_REPORT_REASONS"
          :key="option"
          class="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-zinc-800 px-4 py-2 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-500/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-400"
        >
          <input v-model="reason" type="radio" name="build-report-reason" :value="option" class="h-4 w-4 accent-orange-500" />
          <span class="font-bold">{{ copy.detail.reasons[option] }}</span>
        </label>
      </fieldset>
      <p v-if="failed" role="alert" class="text-sm font-bold text-red-300">{{ copy.detail.reportError }}</p>
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" class="min-h-11 rounded-xl border border-zinc-700 px-4 font-bold text-zinc-200 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400" @click="close">
          {{ copy.detail.reportCancel }}
        </button>
        <button type="submit" :disabled="!reason || sending" class="min-h-11 rounded-xl bg-red-600 px-4 font-bold text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50">
          {{ copy.detail.reportSubmit }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { BUILD_REPORT_REASONS, type BuildReportReason } from "@/utils/build-gallery";

const props = defineProps<{ shortCode: string }>();
const emit = defineEmits<{ close: []; reported: [] }>();

const { copy } = useBuildGalleryCopy();
const api = useBuildApi();
const { show } = useCopyToast();
const dialog = ref<HTMLDialogElement | null>(null);
const reason = ref<BuildReportReason | null>(null);
const sending = ref(false);
const failed = ref(false);
const titleId = `build-report-${useId()}`;

function open() {
  reason.value = null;
  failed.value = false;
  dialog.value?.showModal();
}

function close() {
  dialog.value?.close();
}

async function submit() {
  if (!reason.value || sending.value) return;
  sending.value = true;
  failed.value = false;
  try {
    await api.report(props.shortCode, reason.value);
    close();
    show(copy.value.detail.reportThanks);
    emit("reported");
  } catch {
    failed.value = true;
  } finally {
    sending.value = false;
  }
}

defineExpose({ open, close });
</script>
