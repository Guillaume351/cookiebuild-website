import { readFile } from "node:fs/promises";
import { computed, reactive, ref, watch } from "vue";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { commerceReturnPath, commerceSubscriptionSummary, commerceUnauthorized } from "../composables/useCommerce";
import { COSMETIC_CATALOG_RESPONSE } from "../shared/cosmetics-catalog";

async function pageSetup(name: string, overrides: Record<string, unknown> = {}) {
  const source = await readFile(new URL(`../pages/cosmetics/${name}.vue`, import.meta.url), "utf8");
  const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)![1]!.replace(/^import .+;\n/gm, "");
  const javascript = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const player = ref({ id: "player-1", name: "CookiePlayer" });
  const navigateTo = vi.fn();
  const request = vi.fn().mockImplementation((url: string) => Promise.resolve({ data: url.includes("inventory") ? { entitlements: [], selections: [] } : { orders: [], subscriptions: [], payments: [], events: [] } }));
  const globals = {
    ref, computed, reactive, watch, useSeoMeta: () => {},
    useNuxtApp: () => ({ runWithContext: (callback: () => unknown) => callback() }),
    useCommercePlayer: () => player,
    loadCommerceSession: async () => ({ player: player.value }),
    commerceRequest: request, commerceUnauthorized, commerceReturnPath,
    commerceErrorMessage: () => "Service indisponible", navigateTo,
    useRoute: () => ({ fullPath: "/cosmetics/checkout?product=supporter_permanent", query: { product: "supporter_permanent" } }),
    useFetch: async () => ({ data: ref({ data: { ...COSMETIC_CATALOG_RESPONSE, purchaseEnabled: true } }) }),
    COSMETIC_CATALOG_RESPONSE,
    ...overrides,
  };
  const expose = name === "connect" ? "{ code, connect, error }" : name === "history" ? "{ logout, select, load, player, inventory, error }" : "{ checkout, linkedPlayer, termsAccepted, immediatePerformanceConsent, withdrawalWaiverAcknowledged, error }";
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const page = await new AsyncFunction(...Object.keys(globals), `${javascript}\nreturn ${expose};`)(...Object.values(globals));
  return { page, player, request, navigateTo };
}

describe("commerce navigation and state", () => {
  it("names French correctly when a commerce page has no English translation", async () => {
    const source = await readFile(new URL("../components/LanguageFallbackNotice.vue", import.meta.url), "utf8");
    const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)![1]!.replace(/^import .+;\n/gm, "");
    const javascript = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    const result = new Function("defineProps", "useSiteLocale", "computed", `${javascript}\nreturn { showFallback, message };`)(
      () => ({ availableLocales: ["fr"] }), () => ({ locale: ref({ code: "en" }) }), computed,
    );
    expect(result.showFallback.value).toBe(true);
    expect(result.message.value).toBe("Available page languages: French.");
  });

  it("allows only local checkout/catalog/history destinations", () => {
    expect(commerceReturnPath("/cosmetics/checkout?product=supporter_permanent")).toBe("/cosmetics/checkout?product=supporter_permanent");
    for (const path of ["//evil.test/cosmetics/checkout", "https://evil.test", "/cosmetics/../admin", "/cosmetics/connect", ["/cosmetics/history"]]) {
      expect(commerceReturnPath(path)).toBe("/cosmetics/history");
    }
  });

  it("distinguishes expired login from a service outage", () => {
    expect(commerceUnauthorized({ response: { status: 401 } })).toBe(true);
    expect(commerceUnauthorized({ statusCode: 503 })).toBe(false);
  });

  it("claims linking codes through the CSRF-protected commerce request", async () => {
    const { page, request } = await pageSetup("connect");
    request.mockResolvedValue({ data: { player: { id: "player-1", name: "CookiePlayer" } } });
    page.code.value = " abcd2345 ";
    await page.connect();
    expect(request).toHaveBeenCalledWith("/api/commerce/session", {
      method: "POST", credentials: "include", body: { code: "ABCD2345" },
    });
  });

  it("retains the linked player if server logout fails", async () => {
    const { page, player, request, navigateTo } = await pageSetup("history");
    request.mockRejectedValue(new Error("offline"));
    await page.logout();
    expect(player.value?.id).toBe("player-1");
    expect(navigateTo).not.toHaveBeenCalled();
    expect(page.error.value).toBe("Service indisponible");
  });

  it("does not present stale inventory as active after a failed refresh", async () => {
    const { page, request } = await pageSetup("history");
    expect(page.inventory.value).not.toBeNull();
    request.mockRejectedValue(new Error("offline"));
    await page.load();
    expect(page.inventory.value).toBeNull();
    expect(page.error.value).toBe("Service indisponible");
  });

  it("sends a null selection to turn off an equipped effect", async () => {
    const { page, request } = await pageSetup("history");
    const item = COSMETIC_CATALOG_RESPONSE.items[0];
    page.inventory.value = { entitlements: [], selections: [{ slot: item.slot, cosmeticId: item.id }] };
    await page.select({ cosmeticId: item.id, item });
    expect(request).toHaveBeenCalledWith("/api/commerce/selections", { method: "PUT", body: { slot: item.slot, cosmeticId: null } });
  });

  it("never submits a selection for the automatic arrival effect", async () => {
    const { page, request } = await pageSetup("history");
    const item = COSMETIC_CATALOG_RESPONSE.items.find((item) => item.slot === "JOIN_FLAIR")!;
    request.mockClear();
    await page.select({ cosmeticId: item.id, item });
    expect(request).not.toHaveBeenCalled();
  });

  it("does not turn a session outage into a linking redirect or permit payment", async () => {
    const { page, request, navigateTo } = await pageSetup("checkout", { loadCommerceSession: async () => { throw { statusCode: 503 }; } });
    expect(navigateTo).not.toHaveBeenCalled();
    expect(page.linkedPlayer.value).toBeNull();
    page.termsAccepted.value = true;
    page.immediatePerformanceConsent.value = true;
    page.withdrawalWaiverAcknowledged.value = true;
    await page.checkout();
    expect(request).not.toHaveBeenCalled();
    expect(page.error.value).toBe("Service indisponible");
  });

  it("keeps a disabled checkout readable without forcing account linking", async () => {
    const { page, request, navigateTo } = await pageSetup("checkout", {
      loadCommerceSession: async () => { throw { statusCode: 401 }; },
      useFetch: async () => ({ data: ref({ data: COSMETIC_CATALOG_RESPONSE }) }),
    });
    expect(navigateTo).not.toHaveBeenCalled();
    expect(page.error.value).toBe("");
    await page.checkout();
    expect(request).not.toHaveBeenCalled();
  });

  it("requires all permanent-purchase consent before opening checkout", async () => {
    const { page, request } = await pageSetup("checkout");
    page.termsAccepted.value = true;
    await page.checkout();
    expect(request).not.toHaveBeenCalled();
  });

  it("does not promise renewal for canceled or expired subscription snapshots", () => {
    const base = { orderId: "order", productId: "supporter", status: "active", currentPeriodEnd: "2026-10-01T00:00:00Z", cancelAtPeriodEnd: false, endedAt: null, updatedAt: "2026-09-01" };
    expect(commerceSubscriptionSummary({ ...base, cancelAtPeriodEnd: true })).toContain("Aucun renouvellement");
    expect(commerceSubscriptionSummary({ ...base, status: "canceled" })).toContain("terminé");
    expect(commerceSubscriptionSummary(base, Date.parse("2026-10-02"))).toContain("en attente");
  });
});
