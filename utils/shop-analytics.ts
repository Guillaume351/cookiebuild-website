import { COSMETIC_PRODUCTS } from "#shared/cosmetics-catalog";

export type ShopAnalyticsEvent = "shop_view" | "free_effect_click" | "player_link_success" | "recipient_selected" | "begin_checkout" | "portal_open";
export interface ShopAnalyticsOptions { source?: "home" | "shop"; edition?: "java" | "bedrock"; productId?: string }
export type AnalyticsConsent = "granted" | "denied" | null;
export type GoogleTag = (...args: unknown[]) => void;

export function validAnalyticsId(value: unknown): value is string {
  return typeof value === "string" && /^G-[A-Z0-9]{6,20}$/.test(value);
}

/** Build only bounded, catalog-owned fields. Never forward caller objects to Google. */
export function shopAnalyticsPayload(event: ShopAnalyticsEvent, options: ShopAnalyticsOptions = {}) {
  if (event === "begin_checkout") {
    const product = COSMETIC_PRODUCTS.find((item) => item.id === options.productId);
    if (!product) return null;
    return { currency: "EUR", value: product.priceTtcCents / 100,
      items: [{ item_id: product.id, item_category: product.kind, price: product.priceTtcCents / 100, quantity: 1 }] };
  }
  if (event === "free_effect_click") {
    if (options.source !== "home" && options.source !== "shop") return null;
    return { source: options.source, item_id: "cookie_sparkle_trail" };
  }
  if (event === "recipient_selected") {
    if (options.edition !== "java" && options.edition !== "bedrock") return null;
    return { edition: options.edition };
  }
  if (["shop_view", "player_link_success", "portal_open"].includes(event)) return {};
  return null;
}

export function dispatchShopAnalytics(input: {
  id: unknown; consent: AnalyticsConsent; event: ShopAnalyticsEvent; options?: ShopAnalyticsOptions;
  initialize: () => GoogleTag;
}) {
  if (!validAnalyticsId(input.id) || input.consent !== "granted") return false;
  const payload = shopAnalyticsPayload(input.event, input.options);
  if (!payload) return false;
  input.initialize()("event", input.event, { ...payload, send_to: input.id,
    page_location: "https://www.cookie-build.com/shop", page_referrer: "", page_title: "Cookie Build Shop" });
  return true;
}
