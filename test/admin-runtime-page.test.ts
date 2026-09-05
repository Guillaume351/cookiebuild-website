import { readFile } from "node:fs/promises";
import { computed, reactive, ref } from "vue";
import ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";

// Execute the actual page's setup logic with Vue reactivity and mocked I/O.
// This exercises the real callers without requiring a browser or Nuxt server.
async function setupPage() {
  const source = await readFile(new URL("../pages/admin/runtime.vue", import.meta.url), "utf8");
  const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)![1]!;
  const javascript = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const request = vi.fn().mockResolvedValue({ data: {
    snapshots: [{ serverId: "minecraft-1", observedAt: new Date().toISOString(), payload: { players: [], games: [] } }],
  } });
  const unmounts: Array<() => void> = [];
  const globals = {
    ref, computed, reactive,
    definePageMeta: () => {}, useSeoMeta: () => {}, useAdminAccess: () => ref(true),
    adminRequest: request, adminErrorMessage: () => "Request failed",
    onMounted: (callback: () => void) => callback(),
    onUnmounted: (callback: () => void) => unmounts.push(callback),
  };
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const page = await new AsyncFunction(...Object.keys(globals), `${javascript}\nreturn { liveSnapshots, serverForm, playerForm, preparePlayer, sendServerCommand, sendPlayerCommand, notice };`)(...Object.values(globals));
  return { page, request, unmount: () => unmounts.forEach((callback) => callback()) };
}

describe("admin runtime page", () => {
  afterEach(() => vi.useRealTimers());

  it("expires cached snapshots even when subsequent polls fail", async () => {
    vi.useFakeTimers();
    const { page, request, unmount } = await setupPage();
    expect(page.liveSnapshots.value).toHaveLength(1);
    request.mockRejectedValue(new Error("offline"));
    await vi.advanceTimersByTimeAsync(21_000);
    expect(page.liveSnapshots.value).toHaveLength(0);
    unmount();
  });

  it("retains failed server and player input and clears it after successful retries", async () => {
    vi.useFakeTimers();
    const { page, request, unmount } = await setupPage();
    page.serverForm.value = "Maintenance soon";
    page.preparePlayer({ id: "player", name: "Player", serverId: "minecraft-1" }, "kick");
    page.playerForm.value.text = "Repeated disruption";
    request.mockRejectedValue(new Error("offline"));
    await page.sendServerCommand();
    await page.sendPlayerCommand();
    expect(page.serverForm.value).toBe("Maintenance soon");
    expect(page.playerForm.value.text).toBe("Repeated disruption");
    expect(page.notice.value).toBe("Request failed");
    request.mockResolvedValue({ data: { snapshots: [] } });
    await page.sendServerCommand();
    await page.sendPlayerCommand();
    expect(page.serverForm.value).toBe("");
    expect(page.playerForm.value).toBeNull();
    unmount();
  });
});
