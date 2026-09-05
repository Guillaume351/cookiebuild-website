import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COSMETIC_PRODUCTS } from "../shared/cosmetics-catalog";
import {
  assertStripePriceContract,
  commerceReadiness,
  commerceStripeRuntimeAllowed,
  productFromLookupKey,
  productIdentityFromLookupKey,
  stripeLookupKey,
} from "../server/utils/stripe-commerce";
import {
  createCommerceToken,
  enforceCommerceRateLimit,
  hashCommerceToken,
  resetCommerceRateLimitsForTests,
  validCommerceCsrfToken,
} from "../server/utils/commerce-security";
import {
  ADMIN_REFUND_PENDING_STALE_MS,
  adminRefundPendingIsRecent,
  authoritativeSubscriptionOrderStatus,
  canRestoreSubscriptionDispute,
  canRestoreWonDispute,
  immutableOrderGrants,
  invoiceEntitlementSource,
  orderStatusAfterRefund,
  preserveTerminalSubscriptionOrderStatus,
  shouldGrantInvoiceCoverage,
  subscriptionOrderStatus,
  synchronizedSubscriptionOrderStatus,
} from "../server/utils/commerce-transitions";

const ORIGINAL_ENV = { ...process.env };

function readyEnvironment(mode: "test" | "live" = "test") {
  Object.assign(process.env, {
    NODE_ENV: mode === "live" ? "production" : "test",
    COMMERCE_STRIPE_MODE: mode,
    STRIPE_SECRET_KEY: mode === "live" ? "rk_live_example" : "rk_test_example",
    STRIPE_WEBHOOK_SECRET: "whsec_example",
    COMMERCE_PUBLIC_BASE_URL: mode === "live" ? "https://shop.cookie-build.com" : "http://localhost:3000",
    COMMERCE_STRIPE_AUTOMATIC_TAX: mode === "live" ? "true" : "false",
    COMMERCE_STRIPE_TAX_CODE_DIGITAL: "txcd_10000000",
    COMMERCE_STRIPE_TAX_CODE_SUPPORT: "txcd_20000000",
    COMMERCE_LEGAL_NAME: "TEST Cookie Build",
    COMMERCE_LEGAL_ADDRESS: "TEST address",
    COMMERCE_SUPPORT_EMAIL: "support@cookie-build.com",
    COMMERCE_BUSINESS_STATUS: mode === "live" ? "company" : "test",
    COMMERCE_BUSINESS_ID: "TEST-ID",
    COMMERCE_VAT_STATUS: "not_applicable",
    COMMERCE_MEDIATOR_NAME: "TEST mediator",
    COMMERCE_MEDIATOR_URL: "https://example.com/mediator",
  });
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetCommerceRateLimitsForTests();
});
afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

describe("commerce readiness and Stripe catalog identity", () => {
  it("allows live checkout without optional mediator details while preserving Stripe and tax gates", () => {
    readyEnvironment("live");
    delete process.env.COMMERCE_MEDIATOR_NAME;
    delete process.env.COMMERCE_MEDIATOR_URL;
    expect(commerceReadiness().ready).toBe(true);

    delete process.env.COMMERCE_STRIPE_AUTOMATIC_TAX;
    expect(commerceReadiness().reasons).toContain("COMMERCE_STRIPE_AUTOMATIC_TAX must explicitly be true or false in live mode");
    process.env.COMMERCE_STRIPE_AUTOMATIC_TAX = "false";
    expect(commerceReadiness().ready).toBe(true);

    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(commerceReadiness().reasons).toContain("STRIPE_WEBHOOK_SECRET is missing");
  });

  it("accepts a mode-matched restricted key and rejects test mode in production without staging override", () => {
    readyEnvironment("test");
    expect(commerceReadiness().ready).toBe(true);
    process.env.NODE_ENV = "production";
    expect(commerceReadiness().ready).toBe(false);
    expect(commerceStripeRuntimeAllowed()).toBe(false);
    process.env.COMMERCE_ALLOW_TEST_MODE_IN_PRODUCTION = "true";
    expect(commerceReadiness().ready).toBe(true);
    expect(commerceStripeRuntimeAllowed()).toBe(true);
  });

  it("fails closed on key mode, legal, tax, amount, currency, recurrence, or lookup mismatch", () => {
    readyEnvironment("live");
    expect(commerceReadiness().ready).toBe(true);
    process.env.STRIPE_SECRET_KEY = "sk_test_wrong";
    expect(commerceReadiness().reasons.join(" ")).toMatch(/mode/);
    process.env.STRIPE_SECRET_KEY = "sk_live_ok";
    delete process.env.COMMERCE_STRIPE_TAX_CODE_DIGITAL;
    expect(commerceReadiness().ready).toBe(false);

    const product = COSMETIC_PRODUCTS.find((entry) => entry.id === "supporter_monthly")!;
    const price = {
      active: true,
      livemode: true,
      lookup_key: stripeLookupKey(product.id, product.productVersion),
      currency: "eur",
      unit_amount: 100,
      tax_behavior: "inclusive",
      type: "recurring",
      recurring: { interval: "month", interval_count: 1 },
    } as any;
    expect(assertStripePriceContract(price, product, "live")).toBe(price);
    expect(() => assertStripePriceContract({ ...price, unit_amount: 101 }, product, "live")).toThrow();
    expect(productFromLookupKey(price.lookup_key)).toBe(product.id);
    expect(productIdentityFromLookupKey(price.lookup_key)).toEqual({
      productId: product.id,
      productVersion: product.productVersion,
    });
    expect(productIdentityFromLookupKey(stripeLookupKey(product.id, product.productVersion + 1))).toEqual({
      productId: product.id,
      productVersion: product.productVersion + 1,
    });
    expect(productFromLookupKey("price_opaque")).toBeNull();
  });
});

describe("commerce cookie and request security", () => {
  it("hashes session tokens and accepts only an exact double-submit CSRF pair", () => {
    const token = createCommerceToken();
    expect(token).toHaveLength(43);
    expect(hashCommerceToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCommerceToken(token)).not.toContain(token);
    expect(validCommerceCsrfToken(token, token)).toBe(true);
    expect(validCommerceCsrfToken(token, createCommerceToken())).toBe(false);
  });

  it("bounds repeated calls and still rejects after the limit", () => {
    enforceCommerceRateLimit("claim:ip", 2, 1_000, 100);
    enforceCommerceRateLimit("claim:ip", 2, 1_000, 101);
    expect(() => enforceCommerceRateLimit("claim:ip", 2, 1_000, 102)).toThrow(/Too many commerce requests/);
  });
});

describe("commerce implementation contracts", () => {
  it("blocks a recent pending admin refund and allows only a stale retry of that same payment", () => {
    const now = new Date("2026-08-22T12:00:00Z");
    expect(adminRefundPendingIsRecent(new Date(now.getTime() - ADMIN_REFUND_PENDING_STALE_MS + 1), now)).toBe(true);
    expect(adminRefundPendingIsRecent(new Date(now.getTime() - ADMIN_REFUND_PENDING_STALE_MS), now)).toBe(false);
  });

  it("keeps reversed subscription, invoice and dispute transitions monotone", () => {
    const now = new Date("2026-08-22T12:00:00Z");
    expect(subscriptionOrderStatus("active", false)).toBe("active");
    expect(subscriptionOrderStatus("past_due", false)).toBe("past_due");
    expect(subscriptionOrderStatus("incomplete", false)).toBe("past_due");
    expect(subscriptionOrderStatus("paused", false)).toBe("past_due");
    expect(subscriptionOrderStatus("unpaid", false)).toBe("terminal");
    expect(subscriptionOrderStatus("active", true)).toBe("canceling");
    const afterLostDispute = "disputed";
    const afterDeleted = synchronizedSubscriptionOrderStatus(afterLostDispute, "canceled", false);
    expect(afterDeleted).toBe("canceled");
    expect(orderStatusAfterRefund("subscription", afterDeleted, "succeeded", false, false)).toBe("canceled");
    expect(orderStatusAfterRefund("subscription", "active", "succeeded", false, false)).toBe("active");
    expect(preserveTerminalSubscriptionOrderStatus(afterDeleted, "disputed")).toBe("canceled");
    expect(authoritativeSubscriptionOrderStatus("canceled", false)).toBe("canceled");
    expect(authoritativeSubscriptionOrderStatus("active", true)).toBe("canceling");
    const wonBeforeDelayedDeleted = authoritativeSubscriptionOrderStatus("canceled", false);
    expect(canRestoreSubscriptionDispute(wonBeforeDelayedDeleted)).toBe(false);
    expect(canRestoreSubscriptionDispute("canceling")).toBe(true);
    expect(shouldGrantInvoiceCoverage("paid", new Date("2026-08-21T12:00:00Z"), "active", now)).toBe(false);
    expect(shouldGrantInvoiceCoverage("paid", new Date("2026-09-21T12:00:00Z"), "active", now)).toBe(true);
    expect(shouldGrantInvoiceCoverage("paid", new Date("2026-09-21T12:00:00Z"), "canceled", now)).toBe(false);
    expect(invoiceEntitlementSource("76000000-0000-4000-8000-000000000001", "in_period_n"))
      .not.toBe(invoiceEntitlementSource("76000000-0000-4000-8000-000000000001", "in_period_n_plus_1"));
    expect(canRestoreWonDispute("refunded", "succeeded")).toBe(false);
    expect(canRestoreWonDispute("canceled", "succeeded")).toBe(false);
    expect(canRestoreWonDispute("active", "refunded")).toBe(false);
    expect(canRestoreWonDispute("disputed", "disputed")).toBe(true);
  });

  it("keeps a historical order grant snapshot independent from a later catalog version", () => {
    const historicalGrants = ["supporter_badge"];
    const laterCatalogGrants = ["supporter_badge", "supporter_profile_frame"];
    expect(immutableOrderGrants("permanent", historicalGrants)).toEqual(["supporter_badge"]);
    expect(immutableOrderGrants("permanent", historicalGrants)).not.toEqual(laterCatalogGrants);
    expect(() => immutableOrderGrants("permanent", [])).toThrow();
    expect(immutableOrderGrants("none", [])).toEqual([]);
  });

  it("separates link purposes, keeps the return cookie Lax, and exempts only the exact Stripe webhook", async () => {
    const [mobileLink, commerceSession, middleware, sessionRoute] = await Promise.all([
      readFile(new URL("../server/services/mobile-player-link.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/services/commerce-session.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/middleware/commerce-auth.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/api/commerce/session.post.ts", import.meta.url), "utf8"),
    ]);
    expect(mobileLink.match(/purpose, "mobile_link"/g)?.length).toBeGreaterThanOrEqual(4);
    expect(commerceSession).toContain('purpose, "commerce_session"');
    expect(middleware).toContain('path === "/api/commerce/webhook" && event.method.toUpperCase() === "POST"');
    expect(middleware).toContain("enforceCommerceCsrf");
    expect(middleware).toContain("verifyCommerceSession");
    expect(sessionRoute).toContain('sameSite: "lax"');
    expect(sessionRoute).toContain("httpOnly: true");
  });

  it("stores multi-source grants, invoice payment mapping, withdrawal evidence, and CAS outbox locks", async () => {
    const migration = await readFile(new URL("../drizzle/0016_stripe_commerce.sql", import.meta.url), "utf8");
    expect(migration).toContain('PRIMARY KEY ("player_id", "cosmetic_id", "source")');
    expect(migration).toContain('"purpose" IN (\'mobile_link\', \'commerce_session\')');
    expect(migration).toContain('"entitlement_source" varchar(128)');
    expect(migration).toContain('"coverage_expires_at" timestamptz');
    expect(migration).toContain('"withdrawal_payment_id" uuid');
    expect(migration).toContain('"product_version" integer NOT NULL');
    expect(migration).toContain('"grants_snapshot" jsonb NOT NULL');
    expect(migration).toContain('"lock_token" uuid');
    expect(migration).toContain('"commerce_orders_active_product_uq"');
    expect(migration).toContain("\"access\" <> 'none'");
  });

  it("snapshots version and grants at checkout and versions Stripe bootstrap identity", async () => {
    const [checkoutService, bootstrap] = await Promise.all([
      readFile(new URL("../server/services/commerce.ts", import.meta.url), "utf8"),
      readFile(new URL("../scripts/bootstrap-stripe-commerce.mjs", import.meta.url), "utf8"),
    ]);
    expect(checkoutService).toContain("productVersion: product.productVersion");
    expect(checkoutService).toContain("grantsSnapshot: [...product.grants]");
    expect(checkoutService).toContain("cookiebuild_product_version: String(product.productVersion)");
    expect(bootstrap).toContain("v${product.productVersion}");
    expect(bootstrap).toContain("cookiebuild_product_version: String(catalogProduct.productVersion)");
    expect(bootstrap).toContain("portalMatches.length > 1");
    expect(bootstrap).toContain("Duplicate active Cookie Build customer portal configurations");
    expect(bootstrap).toContain("COMMERCE_WEBHOOK_SECRET_FILE");
    expect(bootstrap).toContain("WEBHOOK SECRET SAVED TO PRIVATE FILE");
    expect(bootstrap).not.toContain("console.log(secret)");
  });

  it("uses raw signed envelopes, a scheduled SKIP LOCKED worker, per-attempt CAS, and no payload persistence", async () => {
    const [route, worker, service] = await Promise.all([
      readFile(new URL("../server/api/commerce/webhook.post.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/plugins/commerce-webhook-worker.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/services/commerce-webhook.ts", import.meta.url), "utf8"),
    ]);
    expect(route).toContain("readCommerceWebhookBody(event.node.req");
    expect(route).toContain("constructEvent(rawBody, signature");

    expect(route).not.toContain("payload:");
    expect(worker).toContain("setInterval");
    expect(worker).toContain("commerceStripeRuntimeAllowed");
    expect(service).toContain("FOR UPDATE SKIP LOCKED");
    expect(service).toContain("lock_token = gen_random_uuid()");
    expect(service).toContain("eq(commerceWebhookEvents.lockToken, claimed.lock_token)");
    expect(service).toContain("invoiceCoverage(invoice, order)");
    expect(service).toContain("stripe:restore:");
    expect(service).toContain("order.grantsSnapshot");
    expect(service).not.toContain("COSMETIC_PRODUCTS.find");
  });

  it("never exposes commerce in the mobile API or Stripe identifiers in the player history DTO", async () => {
    const [mobileDocs, commerce] = await Promise.all([
      readFile(new URL("../docs/mobile-api-v1.md", import.meta.url), "utf8"),
      readFile(new URL("../server/services/commerce.ts", import.meta.url), "utf8"),
    ]);
    expect(mobileDocs).toContain("The current mobile app exposes no cosmetic catalog");
    expect(commerce).not.toMatch(/subscriptions\s*=.*select\(\)\.from\(commerceSubscriptions\)/s);
    const publicHistorySql = commerce.slice(commerce.indexOf("export async function commerceHistory"), commerce.indexOf("export async function requestSubscriptionWithdrawal"));
    expect(publicHistorySql).not.toContain("stripe_payment_intent_id");
    expect(publicHistorySql).not.toContain("stripe_charge_id");
    expect(publicHistorySql).not.toContain("history.details");
  });

  it("requires separate unselected digital-consent controls and explicit payment CTAs", async () => {
    const checkout = await readFile(new URL("../pages/shop/checkout.vue", import.meta.url), "utf8");
    expect(checkout).toContain('v-model="immediatePerformanceConsent"');
    expect(checkout).toContain('v-model="withdrawalWaiverAcknowledged"');
    expect(checkout).not.toContain("checked");
    expect(checkout).toContain("Acheter et payer");
    expect(checkout).toContain("S’abonner et payer");
    expect(checkout).toContain("Destinataire");
  });

  it("rejects a recent pending admin refund and retries only that payment once stale", async () => {
    const service = await readFile(new URL("../server/services/admin-commerce.ts", import.meta.url), "utf8");
    const pendingLookup = service.indexOf('eq(commercePayments.status, "refund_pending")');
    const settledLookup = service.indexOf('inArray(commercePayments.status, ["succeeded", "partially_refunded"])');
    expect(pendingLookup).toBeGreaterThan(-1);
    expect(settledLookup).toBeGreaterThan(pendingLookup);
    expect(service).toContain("adminRefundPendingIsRecent(payment.updatedAt)");
    expect(service).toContain("A Stripe refund is already pending for this order");
  });
});
