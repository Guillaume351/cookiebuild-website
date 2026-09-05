import type Stripe from "stripe";
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bootstrapStripeCommerce } from "../scripts/bootstrap-stripe-commerce.mjs";
import { COSMETIC_PRODUCTS } from "../shared/cosmetics-catalog";

const directories: string[] = [];
afterEach(() => directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));
const url = "https://example.test/api/commerce/webhook";
const original = () => ({ id: "we_original", url, status: "enabled", metadata: { cookiebuild: "commerce-v1" } });
function fixture(initial = [original()]) {
  const directory = mkdtempSync(join(tmpdir(), "commerce-bootstrap-"));
  directories.push(directory);
  const env = { STRIPE_SECRET_KEY: "sk_test_fixture", COMMERCE_STRIPE_MODE: "test", COMMERCE_PUBLIC_BASE_URL: "https://example.test",
    COMMERCE_WEBHOOK_SECRET_FILE: join(directory, "secret"), COMMERCE_WEBHOOK_ROTATION_ID: "rotation_fixture_1" };
  const calls: Array<{ operation: string; id?: string; payload: any; options: any }> = [];
  const endpoints: any[] = [...initial];
  const output: string[] = [];
  const pages = (items: any[]) => ({
    // The first page deliberately excludes the target; all pages must be consumed.
    data: [],
    async *[Symbol.asyncIterator]() { for (const item of items) yield item; },
  });
  const update = (operation: string) => async (id: string, payload: any, options: any) => {
    calls.push({ operation, id, payload, options }); return { id, ...payload };
  };
  let failAfterCreation = false;
  const saved = new Map<string, any>();
  // Stripe deletes metadata keys whose supplied value is the empty string.
  const products: any[] = COSMETIC_PRODUCTS.map((p) => ({ id: `prod_${p.id}`, livemode: false,
        metadata: { cookiebuild_product_id: p.id, cookiebuild_product_version: String(p.productVersion),
          cookiebuild_access: p.access, ...(p.grants.length ? { cookiebuild_grants: p.grants.join(",") } : {}) } }));
  const stripeClient = {
    products: {
      list: () => pages(products),
      update: update("product.update"),
      create: () => { throw new Error("Existing paginated product was missed"); },
    },
    prices: { list: async ({ lookup_keys }: any) => {
      const p = COSMETIC_PRODUCTS.find((p) => lookup_keys[0] === `cookiebuild_${p.id}_eur_v${p.productVersion}`)!;
      return { data: [{ id: `price_${p.id}`, product: `prod_${p.id}`, livemode: false, currency: "eur", unit_amount: p.priceTtcCents,
        tax_behavior: "inclusive", type: p.access === "subscription" ? "recurring" : "one_time", recurring: { interval: "month", interval_count: 1 } }] };
    } },
    billingPortal: { configurations: { list: () => pages([{ id: "bpc_fixture", metadata: { cookiebuild: "commerce-v1" } }]),
      update: update("portal.update"), create: () => { throw new Error("Existing paginated portal was missed"); } } },
    webhookEndpoints: {
      list: () => pages(endpoints), update: update("webhook.update"),
      create: async (payload: any, options: any) => {
        calls.push({ operation: "webhook.create", payload, options });
        let result = saved.get(options.idempotencyKey);
        if (!result) {
          result = { ...payload, id: "we_replacement", status: "enabled", created: Math.floor(Date.now() / 1000), secret: "whsec_testSigningSecret" };
          saved.set(options.idempotencyKey, result);
          const { secret, ...listed } = result;
          endpoints.push(listed);
        }
        if (failAfterCreation) { failAfterCreation = false; throw new Error("Response lost after endpoint creation"); }
        return result;
      },
    },
  };
  const run = (argv = ["--apply"]) => bootstrapStripeCommerce({ env, argv, stripeClient: stripeClient as unknown as Stripe, writeOutput: (text: string) => output.push(text) });
  return { env, run, calls, endpoints, products, output, loseNextResponse: () => { failAfterCreation = true; } };
}

describe("Stripe bootstrap recovery and synchronization", () => {
  it("accepts omitted empty grants on support-only products without granting anything", async () => {
    const f = fixture();
    const support = f.products.filter((product) => product.metadata.cookiebuild_access === "none");
    expect(support.length).toBeGreaterThan(0);
    expect(support.every((product) => !("cookiebuild_grants" in product.metadata))).toBe(true);
    await f.run();
    for (const product of support) {
      const update = f.calls.find((call) => call.operation === "product.update" && call.id === product.id);
      expect(update?.payload.metadata.cookiebuild_grants).toBe("");
    }
  });

  it("still rejects omitted grants on products that confer entitlements", async () => {
    const f = fixture();
    const paid = f.products.find((product) => product.metadata.cookiebuild_grants);
    delete paid.metadata.cookiebuild_grants;
    await expect(f.run()).rejects.toThrow("product contract mismatch");
    expect(f.calls.some((call) => call.operation === "product.update" && call.id === paid.id)).toBe(false);
  });

  it("recovers a lost rotation response with the same create key and retains both endpoints", async () => {
    const f = fixture(); f.loseNextResponse();
    await expect(f.run(["--apply", "--rotate-webhook-secret"])).rejects.toThrow("Response lost");
    expect(existsSync(f.env.COMMERCE_WEBHOOK_SECRET_FILE)).toBe(false);
    await f.run(["--apply", "--rotate-webhook-secret"]);
    expect(readFileSync(f.env.COMMERCE_WEBHOOK_SECRET_FILE, "utf8")).toBe("whsec_testSigningSecret\n");
    expect(f.endpoints).toHaveLength(2);
    const creates = f.calls.filter((call) => call.operation === "webhook.create");
    expect(creates).toHaveLength(2);
    expect(creates[1]).toEqual(creates[0]);
    expect(f.output.join("")).not.toContain("whsec_");
    expect(f.output.join("")).toContain("PREVIOUS WEBHOOK REMAINS ACTIVE we_original");
  });

  it("synchronizes an intentional overlap and preserves rotation metadata", async () => {
    const f = fixture();
    await f.run(["--apply", "--rotate-webhook-secret"]);
    f.env.COMMERCE_WEBHOOK_SECRET_FILE += "-sync";
    await f.run();
    const updates = f.calls.filter((call) => call.operation === "webhook.update");
    expect(updates.map((call) => call.id)).toEqual(["we_original", "we_replacement"]);
    expect(updates[1]?.payload.metadata.replaces).toBe("we_original");
    expect(updates[1]?.payload.metadata.rotation).toBe("rotation_fixture_1");
    expect(existsSync(f.env.COMMERCE_WEBHOOK_SECRET_FILE)).toBe(false);
  });

  it("does not create another replacement after the bounded recovery window", async () => {
    const f = fixture(); f.loseNextResponse();
    await expect(f.run(["--apply", "--rotate-webhook-secret"])).rejects.toThrow("Response lost");
    f.endpoints[1].created -= 24 * 60 * 60;
    await expect(f.run(["--apply", "--rotate-webhook-secret"])).rejects.toThrow("recovery window expired");
    expect(f.calls.filter((call) => call.operation === "webhook.create")).toHaveLength(1);
  });

  it("rejects unrelated same-URL duplicates", async () => {
    const f = fixture([original(), { ...original(), id: "we_unrelated" }]);
    await expect(f.run()).rejects.toThrow("Duplicate enabled");
    expect(f.calls.filter((call) => call.operation.startsWith("webhook."))).toHaveLength(0);
  });

  it("keeps update keys stable for retries and changes them when their payload changes", async () => {
    const f = fixture();
    await f.run();
    const first = f.calls.map((call) => call.options.idempotencyKey);
    f.calls.length = 0;
    await f.run();
    expect(f.calls.map((call) => call.options.idempotencyKey)).toEqual(first);
    const oldProduct = f.calls.find((call) => call.operation === "product.update")!.options.idempotencyKey;
    const oldPortal = f.calls.find((call) => call.operation === "portal.update")!.options.idempotencyKey;
    const oldWebhook = f.calls.find((call) => call.operation === "webhook.update")!.options.idempotencyKey;
    f.calls.length = 0;
    Object.assign(f.env, { COMMERCE_STRIPE_TAX_CODE_DIGITAL: "txcd_12345", COMMERCE_STRIPE_TAX_CODE_SUPPORT: "txcd_12345", COMMERCE_PUBLIC_BASE_URL: "https://other.example.test" });
    f.endpoints[0].url = "https://other.example.test/api/commerce/webhook";
    f.endpoints[0].metadata.operator = "retained";
    await f.run();
    expect(f.calls.find((call) => call.operation === "product.update")!.options.idempotencyKey).not.toBe(oldProduct);
    expect(f.calls.find((call) => call.operation === "portal.update")!.options.idempotencyKey).not.toBe(oldPortal);
    expect(f.calls.find((call) => call.operation === "webhook.update")!.options.idempotencyKey).not.toBe(oldWebhook);
  });
});
