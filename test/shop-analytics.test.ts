import { describe, expect, it, vi } from "vitest";
import { dispatchShopAnalytics, shopAnalyticsPayload, validAnalyticsId } from "../utils/shop-analytics";

describe("consent-gated shop analytics", () => {
  it("never initializes Google before consent or without a verified-format ID", () => {
    const initialize = vi.fn();
    for (const consent of [null, "denied"] as const) expect(dispatchShopAnalytics({ id: "G-TEST123456", consent, event: "shop_view", initialize })).toBe(false);
    for (const id of ["", "G-example<script>", undefined]) expect(dispatchShopAnalytics({ id, consent: "granted", event: "shop_view", initialize })).toBe(false);
    expect(initialize).not.toHaveBeenCalled();
  });
  it("emits only allowlisted fields and sanitized location after consent", () => {
    const tag = vi.fn(); const initialize = vi.fn(() => tag);
    expect(dispatchShopAnalytics({ id: "G-TEST123456", consent: "granted", event: "recipient_selected", options: { edition: "bedrock", playerId: "private-uuid", name: ".PrivateName", code: "private-code", url: "https://checkout.stripe.com/private", email: "private@example.com" } as any, initialize })).toBe(true);
    expect(tag).toHaveBeenCalledWith("event", "recipient_selected", { edition: "bedrock", send_to: "G-TEST123456", page_location: "https://www.cookie-build.com/shop", page_referrer: "", page_title: "Cookie Build Shop" });
    expect(JSON.stringify(tag.mock.calls)).not.toContain("private");
  });
  it("derives checkout values only from the real catalog and never treats a return as a purchase", () => {
    expect(shopAnalyticsPayload("begin_checkout", { productId: "supporter_monthly" })).toMatchObject({ currency: "EUR", value: 1, items: [{ item_id: "supporter_monthly", price: 1, quantity: 1 }] });
    expect(shopAnalyticsPayload("begin_checkout", { productId: "private-order" })).toBeNull();
    expect(shopAnalyticsPayload("purchase" as any)).toBeNull();
    expect(shopAnalyticsPayload("recipient_selected", { edition: "private-name" } as any)).toBeNull();
    expect(shopAnalyticsPayload("free_effect_click", { source: "private-url" } as any)).toBeNull();
  });
  it("drops subsequent events when consent is withdrawn without retaining a replay queue", () => {
    const tag = vi.fn(); const initialize = vi.fn(() => tag);
    dispatchShopAnalytics({ id: "G-TEST123456", consent: "granted", event: "shop_view", initialize });
    dispatchShopAnalytics({ id: "G-TEST123456", consent: "denied", event: "portal_open", initialize });
    expect(tag).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(validAnalyticsId("G-TEST123456")).toBe(true);
  });
});

import { readFile } from "node:fs/promises";
import ts from "typescript";
import { ref, watch, nextTick, effectScope } from "vue";

async function browserFixture() {
  const source = (await readFile(new URL("../composables/useShopAnalytics.ts", import.meta.url), "utf8"))
    .replace(/^import .*;\n/gm, "").replace("export function", "function").replaceAll("import.meta.client", "true");
  const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const target: Record<string, any> = {};
  const append = vi.fn(); const state = new Map(); const savedConsent = ref(null);
  const document = { cookie: "_ga=fixture; _ga_TEST123456=fixture; essential=retained", createElement: () => ({}), head: { append } };
  const factory = new Function("window", "document", "location", "useRuntimeConfig", "useCookie", "useState", "dispatchShopAnalytics", "validAnalyticsId", javascript + "\nreturn useShopAnalytics;");
  const useAnalytics = factory(target, document, { hostname: "www.cookie-build.com" }, () => ({ public: { gaMeasurementId: "G-TEST123456" } }), () => savedConsent,
    (key: string, init: () => unknown) => { if (!state.has(key)) state.set(key, ref(init())); return state.get(key); }, dispatchShopAnalytics, validAnalyticsId);
  return { useAnalytics, target, append, savedConsent };
}

describe("browser consent lifecycle", () => {
  it("shares consent, loads one tag only after permission, and blocks dispatch after withdrawal", async () => {
    const { useAnalytics, target, append, savedConsent } = await browserFixture();
    const banner = useAnalytics(); const page = useAnalytics();
    expect(page.track("shop_view")).toBe(false);
    expect(append).not.toHaveBeenCalled();
    expect(target.dataLayer).toBeUndefined();
    banner.setConsent("granted");
    expect(page.consent.value).toBe("granted");
    expect(savedConsent.value).toBe("granted");
    expect(append).toHaveBeenCalledTimes(1);
    expect(page.track("shop_view")).toBe(true);
    expect(append).toHaveBeenCalledTimes(1);
    banner.setConsent("denied");
    expect(target["ga-disable-G-TEST123456"]).toBe(true);
    expect(page.track("portal_open")).toBe(false);
    banner.setConsent("granted");
    expect(target["ga-disable-G-TEST123456"]).toBe(false);
    expect(append).toHaveBeenCalledTimes(1);
    const commands = target.dataLayer.map((args: IArguments) => Array.from(args));
    expect(commands[0]).toEqual(["consent", "default", expect.objectContaining({ analytics_storage: "denied", ad_storage: "denied" })]);
    expect(commands.at(-1)).toEqual(["consent", "update", { analytics_storage: "granted" }]);
    expect(commands.find((args: unknown[]) => args[0] === "config")?.[2]).toMatchObject({ send_page_view: false, page_location: "https://www.cookie-build.com/shop", page_referrer: "", allow_google_signals: false });
  });
});


it("tracks the already-open shop once when permission is granted without navigation", async () => {
  const { useAnalytics, target } = await browserFixture();
  const source = await readFile(new URL("../pages/shop/index.vue", import.meta.url), "utf8");
  const start = source.indexOf("const shopAnalytics = useShopAnalytics();");
  const end = source.indexOf("const french =", start);
  expect(start).toBeGreaterThan(0);
  const setup = new Function("useShopAnalytics", "onMounted", "watch", source.slice(start, end));
  const mounted: Array<() => void> = [];
  const scope = effectScope();
  try {
    scope.run(() => setup(useAnalytics, (callback: () => void) => mounted.push(callback), watch));
    for (const callback of mounted) callback();
    expect(target.dataLayer).toBeUndefined();
    const banner = useAnalytics();
    banner.setConsent("granted");
    await nextTick();
    const events = () => target.dataLayer.map((args: IArguments) => Array.from(args)).filter((args: unknown[]) => args[0] === "event");
    expect(events()).toHaveLength(1);
    expect(events()[0][1]).toBe("shop_view");
    banner.setConsent("denied");
    await nextTick();
    banner.setConsent("granted");
    await nextTick();
    expect(events()).toHaveLength(1);
  } finally { scope.stop(); }
});
