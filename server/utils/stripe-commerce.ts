import Stripe from "stripe";
import { createError } from "h3";
import type { COSMETIC_PRODUCTS } from "../../shared/cosmetics-catalog";

export type CommerceMode = "test" | "live";
export type CosmeticProduct = (typeof COSMETIC_PRODUCTS)[number];

export interface CommerceReadiness {
  ready: boolean;
  mode: CommerceMode | null;
  publicBaseUrl: string | null;
  automaticTax: boolean;
  reasons: string[];
  publicMessage: string | null;
}

let stripeOverride: Stripe | null = null;

function envText(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

function validHttpBaseUrl(value: string | null, live: boolean) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if ((live && url.protocol !== "https:") || (!live && !["http:", "https:"].includes(url.protocol))) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function commerceReadiness(): CommerceReadiness {
  const reasons: string[] = [];
  const modeValue = envText("COMMERCE_STRIPE_MODE");
  const mode = modeValue === "test" || modeValue === "live" ? modeValue : null;
  if (!mode) reasons.push("COMMERCE_STRIPE_MODE must be test or live");
  const live = mode === "live";
  if (process.env.NODE_ENV === "production" && mode === "test" && envText("COMMERCE_ALLOW_TEST_MODE_IN_PRODUCTION") !== "true") {
    reasons.push("Stripe test mode is disabled in production without an explicit staging override");
  }

  const secret = envText("STRIPE_SECRET_KEY");
  const expectedKeyPrefixes = live ? ["sk_live_", "rk_live_"] : ["sk_test_", "rk_test_"];
  if (!secret || !expectedKeyPrefixes.some((prefix) => secret.startsWith(prefix))) {
    reasons.push("STRIPE_SECRET_KEY does not match the configured Stripe mode");
  }
  if (!envText("STRIPE_WEBHOOK_SECRET")?.startsWith("whsec_")) {
    reasons.push("STRIPE_WEBHOOK_SECRET is missing");
  }
  const publicBaseUrl = validHttpBaseUrl(envText("COMMERCE_PUBLIC_BASE_URL"), live);
  if (!publicBaseUrl) reasons.push("COMMERCE_PUBLIC_BASE_URL is missing or invalid for this mode");

  const taxChoice = envText("COMMERCE_STRIPE_AUTOMATIC_TAX");
  const automaticTax = taxChoice === "true";
  if (live && !["true", "false"].includes(taxChoice || "")) reasons.push("COMMERCE_STRIPE_AUTOMATIC_TAX must explicitly be true or false in live mode");
  if (live && automaticTax && !/^txcd_\d+$/.test(envText("COMMERCE_STRIPE_TAX_CODE_DIGITAL") || "")) {
    reasons.push("COMMERCE_STRIPE_TAX_CODE_DIGITAL is required in live mode");
  }
  if (live && automaticTax && !/^txcd_\d+$/.test(envText("COMMERCE_STRIPE_TAX_CODE_SUPPORT") || "")) {
    reasons.push("COMMERCE_STRIPE_TAX_CODE_SUPPORT is required in live mode");
  }

  const legalName = envText("COMMERCE_LEGAL_NAME");
  const legalAddress = envText("COMMERCE_LEGAL_ADDRESS");
  const supportEmail = envText("COMMERCE_SUPPORT_EMAIL");
  const status = envText("COMMERCE_BUSINESS_STATUS");
  if (!legalName) reasons.push("COMMERCE_LEGAL_NAME is missing");
  if (!legalAddress) reasons.push("COMMERCE_LEGAL_ADDRESS is missing");
  if (!supportEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(supportEmail)) {
    reasons.push("COMMERCE_SUPPORT_EMAIL is missing or invalid");
  }
  if (!status || !["test", "individual", "company", "association"].includes(status)) {
    reasons.push("COMMERCE_BUSINESS_STATUS is missing or invalid");
  }
  if (live && status === "test") reasons.push("COMMERCE_BUSINESS_STATUS=test is forbidden in live mode");
  if (live && !envText("COMMERCE_BUSINESS_ID")) reasons.push("COMMERCE_BUSINESS_ID is missing");
  const vatStatus = envText("COMMERCE_VAT_STATUS");
  if (!vatStatus || !["not_applicable", "registered"].includes(vatStatus)) {
    reasons.push("COMMERCE_VAT_STATUS is missing or invalid");
  }
  if (vatStatus === "registered" && !envText("COMMERCE_VAT_ID")) reasons.push("COMMERCE_VAT_ID is missing");

  return {
    ready: reasons.length === 0,
    mode,
    publicBaseUrl,
    automaticTax,
    reasons,
    publicMessage: reasons.length ? "Les achats sont temporairement indisponibles. Le catalogue reste consultable." : null,
  };
}

export function commerceStripeRuntimeAllowed() {
  const mode = envText("COMMERCE_STRIPE_MODE");
  return mode === "live"
    || (mode === "test" && (process.env.NODE_ENV !== "production" || envText("COMMERCE_ALLOW_TEST_MODE_IN_PRODUCTION") === "true"));
}

export function commercePublicLegalIdentity() {
  return {
    legalName: envText("COMMERCE_LEGAL_NAME"),
    legalAddress: envText("COMMERCE_LEGAL_ADDRESS"),
    supportEmail: envText("COMMERCE_SUPPORT_EMAIL"),
    businessStatus: envText("COMMERCE_BUSINESS_STATUS"),
    businessId: envText("COMMERCE_BUSINESS_ID"),
    vatId: envText("COMMERCE_VAT_ID"),
    vatStatus: envText("COMMERCE_VAT_STATUS"),
    mediatorName: envText("COMMERCE_MEDIATOR_NAME"),
    mediatorUrl: validHttpBaseUrl(envText("COMMERCE_MEDIATOR_URL"), true),
  };
}

export function requireCommerceReadiness() {
  const readiness = commerceReadiness();
  if (!readiness.ready || !readiness.mode || !readiness.publicBaseUrl) {
    throw createError({ statusCode: 503, statusMessage: readiness.publicMessage || "Commerce is unavailable" });
  }
  return readiness as CommerceReadiness & { mode: CommerceMode; publicBaseUrl: string };
}

export function stripeClient() {
  if (stripeOverride) return stripeOverride;
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) throw createError({ statusCode: 503, statusMessage: "Stripe is not configured" });
  return new Stripe(secret, { appInfo: { name: "Cookie Build Website" }, maxNetworkRetries: 2, timeout: 10_000 });
}

export function setStripeClientForTests(client: Stripe | null) {
  stripeOverride = client;
}

export function stripeLookupKey(productId: string, productVersion: number) {
  if (!/^[a-z0-9_]{3,96}$/.test(productId)) throw new Error("Invalid catalog product ID");
  if (!Number.isSafeInteger(productVersion) || productVersion < 1) throw new Error("Invalid catalog product version");
  return `cookiebuild_${productId}_eur_v${productVersion}`;
}

export function productIdentityFromLookupKey(lookupKey: string | null | undefined) {
  const match = /^cookiebuild_([a-z0-9_]{3,96})_eur_v([1-9][0-9]*)$/.exec(lookupKey || "");
  if (!match) return null;
  const productVersion = Number(match[2]);
  if (!Number.isSafeInteger(productVersion)) return null;
  return { productId: match[1]!, productVersion };
}

export function productFromLookupKey(lookupKey: string | null | undefined) {
  return productIdentityFromLookupKey(lookupKey)?.productId || null;
}

export function assertStripePriceContract(price: Stripe.Price, product: CosmeticProduct, mode: CommerceMode) {
  const expectedLookupKey = stripeLookupKey(product.id, product.productVersion);
  const recurring = product.access === "subscription";
  const valid = price.active
    && price.livemode === (mode === "live")
    && price.lookup_key === expectedLookupKey
    && price.currency.toUpperCase() === "EUR"
    && price.unit_amount === product.priceTtcCents
    && price.tax_behavior === "inclusive"
    && (recurring
      ? price.type === "recurring" && price.recurring?.interval === "month" && price.recurring.interval_count === 1
      : price.type === "one_time" && !price.recurring);
  if (!valid) {
    throw createError({ statusCode: 503, statusMessage: "The configured Stripe price does not match the public catalog" });
  }
  return price;
}

export async function resolveStripePrice(client: Stripe, product: CosmeticProduct, mode: CommerceMode) {
  const lookupKey = stripeLookupKey(product.id, product.productVersion);
  const response = await client.prices.list({ active: true, lookup_keys: [lookupKey], limit: 10, expand: ["data.product"] });
  if (response.data.length !== 1) {
    throw createError({ statusCode: 503, statusMessage: "The Stripe catalog is not uniquely configured" });
  }
  const candidate = response.data[0];
  if (!candidate) throw createError({ statusCode: 503, statusMessage: "The Stripe price is missing" });
  const price = assertStripePriceContract(candidate, product, mode);
  const stripeProduct = price.product;
  if (typeof stripeProduct === "string" || stripeProduct.deleted
    || stripeProduct.metadata.cookiebuild_product_id !== product.id
    || stripeProduct.metadata.cookiebuild_product_version !== String(product.productVersion)
    || stripeProduct.metadata.cookiebuild_access !== product.access
    || (stripeProduct.metadata.cookiebuild_grants ?? "") !== product.grants.join(",")) {
    throw createError({ statusCode: 503, statusMessage: "The Stripe product metadata does not match the public catalog" });
  }
  return price;
}

export function assertStripeLivemode(livemode: boolean, mode: CommerceMode) {
  if (!["test", "live"].includes(mode) || livemode !== (mode === "live")) {
    throw createError({ statusCode: 400, statusMessage: "Stripe event mode does not match the configured commerce mode" });
  }
}
