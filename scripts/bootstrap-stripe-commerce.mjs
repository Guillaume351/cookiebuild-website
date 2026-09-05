import Stripe from "stripe";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { prepareWebhookSecretFile } from "./webhook-secret-file.mjs";
import { COSMETIC_PRODUCTS } from "../shared/cosmetics-catalog.ts";

function updateKey(resource, payload) {
  return `${resource}:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
}

/**
 * @param {{ env?: NodeJS.ProcessEnv, argv?: string[], stripeClient?: Stripe,
 *   writeOutput?: (text: string) => void }} options
 */
export async function bootstrapStripeCommerce({
  env = process.env, argv = process.argv.slice(2), stripeClient,
  writeOutput = (text) => { process.stdout.write(text); },
} = {}) {
  const apply = argv.includes("--apply");
  const rotateWebhookSecret = argv.includes("--rotate-webhook-secret");
  const key = env.STRIPE_SECRET_KEY?.trim();
  const mode = env.COMMERCE_STRIPE_MODE?.trim();
  const baseUrl = env.COMMERCE_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, "");
  const digitalTaxCode = env.COMMERCE_STRIPE_TAX_CODE_DIGITAL?.trim();
  const supportTaxCode = env.COMMERCE_STRIPE_TAX_CODE_SUPPORT?.trim();
  if (!key || !["test", "live"].includes(mode) || !baseUrl) {
    throw new Error("STRIPE_SECRET_KEY, COMMERCE_STRIPE_MODE and COMMERCE_PUBLIC_BASE_URL are required");
  }
  const prefixes = mode === "live" ? ["sk_live_", "rk_live_"] : ["sk_test_", "rk_test_"];
  if (!prefixes.some((prefix) => key.startsWith(prefix))) throw new Error("Stripe key and COMMERCE_STRIPE_MODE mismatch");
  if (mode === "live" && !baseUrl.startsWith("https://")) throw new Error("Live bootstrap requires an HTTPS public URL");
  if (mode === "live" && !["true", "false"].includes(env.COMMERCE_STRIPE_AUTOMATIC_TAX)) {
    throw new Error("Live bootstrap requires an explicit COMMERCE_STRIPE_AUTOMATIC_TAX choice");
  }
  if (mode === "live" && env.COMMERCE_STRIPE_AUTOMATIC_TAX === "true" && (!/^txcd_\d+$/.test(digitalTaxCode || "") || !/^txcd_\d+$/.test(supportTaxCode || ""))) {
    throw new Error("Live bootstrap requires explicit digital and voluntary-support Stripe tax codes");
  }

  const stripe = stripeClient ?? new Stripe(key, { appInfo: { name: "Cookie Build Commerce Bootstrap" }, maxNetworkRetries: 2 });
  const webhookEvents = [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
    "invoice.paid",
    "invoice.payment_failed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "refund.created",
    "refund.updated",
    "refund.failed",
    "charge.dispute.created",
    "charge.dispute.closed",
  ];

  function lookupKey(product) { return `cookiebuild_${product.id}_eur_v${product.productVersion}`; }
  function log(action, detail) { writeOutput(`${apply ? "APPLY" : "DRY-RUN"} ${action}: ${detail}\n`); }
  // Reserve a private destination before the first Stripe mutation. Never print the secret.
  const secretFile = apply ? prepareWebhookSecretFile(env.COMMERCE_WEBHOOK_SECRET_FILE) : null;
  const closeSecretFile = () => secretFile?.close();
  if (secretFile) process.once("exit", closeSecretFile);
  try {
  function revealWebhookSecret(secret) {
    secretFile.write(secret);
    writeOutput("WEBHOOK SECRET SAVED TO PRIVATE FILE; transfer it to the secret manager and remove the file.\n");
  }

  const existingProducts = [];
  for await (const product of stripe.products.list({ limit: 100 })) existingProducts.push(product);
  for (const catalogProduct of COSMETIC_PRODUCTS) {
    const matches = existingProducts.filter((product) => product.metadata.cookiebuild_product_id === catalogProduct.id
      && product.metadata.cookiebuild_product_version === String(catalogProduct.productVersion)
      && !product.deleted);
    if (matches.length > 1) throw new Error(`Duplicate Stripe products for ${catalogProduct.id} v${catalogProduct.productVersion}`);
    let product = matches[0];
    const productPayload = {
      name: catalogProduct.name,
      description: catalogProduct.description,
      active: true,
      metadata: {
        cookiebuild_product_id: catalogProduct.id,
        cookiebuild_product_version: String(catalogProduct.productVersion),
        cookiebuild_access: catalogProduct.access,
        cookiebuild_grants: catalogProduct.grants.join(","),
      },
      ...((catalogProduct.access === "none" ? supportTaxCode : digitalTaxCode)
        ? { tax_code: catalogProduct.access === "none" ? supportTaxCode : digitalTaxCode }
        : {}),
    };
    if (!product) {
      log("create product", catalogProduct.id);
      if (apply) product = await stripe.products.create(productPayload, { idempotencyKey: `bootstrap-product:${catalogProduct.id}:v${catalogProduct.productVersion}` });
    } else {
      if (product.livemode !== (mode === "live")
        || product.metadata.cookiebuild_access !== catalogProduct.access
        || (product.metadata.cookiebuild_grants ?? "") !== catalogProduct.grants.join(",")) {
        throw new Error(`Existing Stripe product contract mismatch for ${catalogProduct.id}; increment productVersion instead of mutating grants`);
      }
      log("sync product", `${catalogProduct.id} (${product.id})`);
      if (apply) product = await stripe.products.update(product.id, productPayload, { idempotencyKey: updateKey(`bootstrap-product-update:${product.id}`, productPayload) });
    }

    const prices = await stripe.prices.list({ lookup_keys: [lookupKey(catalogProduct)], active: true, limit: 10 });
    if (prices.data.length > 1) throw new Error(`Duplicate active Stripe prices for ${lookupKey(catalogProduct)}`);
    const price = prices.data[0];
    if (price) {
      const valid = Boolean(product)
        && (typeof price.product === "string" ? price.product : price.product.id) === product.id
        && price.livemode === (mode === "live")
        && price.currency === "eur"
        && price.unit_amount === catalogProduct.priceTtcCents
        && price.tax_behavior === "inclusive"
        && (catalogProduct.access === "subscription"
          ? price.type === "recurring" && price.recurring?.interval === "month" && price.recurring.interval_count === 1
          : price.type === "one_time");
      if (!valid) throw new Error(`Existing Stripe price contract mismatch for ${catalogProduct.id}; create a new catalog version instead of mutating money fields`);
      log("verify price", `${lookupKey(catalogProduct)} (${price.id})`);
    } else {
      log("create price", `${lookupKey(catalogProduct)} ${(catalogProduct.priceTtcCents / 100).toFixed(2)} EUR TTC`);
      if (apply && product) await stripe.prices.create({
        product: product.id,
        currency: "eur",
        unit_amount: catalogProduct.priceTtcCents,
        tax_behavior: "inclusive",
        lookup_key: lookupKey(catalogProduct),
        ...(catalogProduct.access === "subscription" ? { recurring: { interval: "month", interval_count: 1 } } : {}),
      }, { idempotencyKey: `bootstrap-price:${catalogProduct.id}:eur:v${catalogProduct.productVersion}` });
    }
  }

  const portalConfigurations = [];
  for await (const entry of stripe.billingPortal.configurations.list({ active: true, limit: 100 })) portalConfigurations.push(entry);
  const portalMatches = portalConfigurations.filter((entry) => entry.metadata?.cookiebuild === "commerce-v1");
  if (portalMatches.length > 1) throw new Error("Duplicate active Cookie Build customer portal configurations");
  const portal = portalMatches[0];
  const portalPayload = {
    login_page: { enabled: true },
    default_return_url: `${baseUrl}/shop/history`,
    business_profile: {
      headline: "Gérer les paiements et l’abonnement Cookie Build",
      privacy_policy_url: `${baseUrl}/privacy`,
      terms_of_service_url: `${baseUrl}/terms`,
    },
    features: {
      customer_update: { enabled: true, allowed_updates: ["address", "name"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end", cancellation_reason: { enabled: true, options: ["too_expensive", "missing_features", "switched_service", "unused", "other"] } },
    },
    metadata: { cookiebuild: "commerce-v1" },
  };
  log(portal ? "sync portal" : "create portal", portal?.id || "commerce-v1");
  if (apply) {
    const configuredPortal = portal
      ? await stripe.billingPortal.configurations.update(portal.id, portalPayload, { idempotencyKey: updateKey(`bootstrap-portal-update:${portal.id}`, portalPayload) })
      : await stripe.billingPortal.configurations.create(portalPayload, { idempotencyKey: "bootstrap-portal-create:commerce-v1" });
    writeOutput(`PORTAL CONFIGURATION ${configuredPortal.id}\n`);
  }

  const webhookUrl = `${baseUrl}/api/commerce/webhook`;
  const endpoints = [];
  for await (const entry of stripe.webhookEndpoints.list({ limit: 100 })) endpoints.push(entry);
  const endpointMatches = endpoints.filter((endpoint) => endpoint.url === webhookUrl && endpoint.status !== "disabled");
  const rotationId = env.COMMERCE_WEBHOOK_ROTATION_ID?.trim();
  if (rotateWebhookSecret) {
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(rotationId || "")) {
      throw new Error("Rotation requires a unique COMMERCE_WEBHOOK_ROTATION_ID");
    }
    const replacements = endpointMatches.filter((endpoint) => endpoint.metadata?.rotation === rotationId);
    const previous = endpointMatches.filter((endpoint) => endpoint.metadata?.rotation !== rotationId);
    if (replacements.length > 1 || previous.length > 1 || (!previous.length && !replacements.length)) {
      throw new Error("Rotation requires one previous endpoint and at most its matching replacement");
    }
    const replacement = replacements[0];
    const previousId = previous[0]?.id ?? replacement?.metadata?.replaces;
    if (!previousId || (replacement && replacement.metadata?.replaces !== previousId)) {
      throw new Error("Existing webhook replacement does not match the requested rotation");
    }
    // Retry the same create request to recover its one-time signing secret. Refuse
    // old retries before Stripe may prune the idempotency record and create a duplicate.
    if (replacement && (!Number.isFinite(replacement.created)
      || Date.now() / 1000 - replacement.created >= 23 * 60 * 60)) {
      throw new Error("Rotation secret recovery window expired; use the saved secret or complete a new controlled rotation");
    }
    log(replacement ? "recover webhook rotation" : "rotate webhook secret", webhookUrl);
    if (apply) {
      const created = await stripe.webhookEndpoints.create({
        url: webhookUrl, enabled_events: webhookEvents,
        metadata: { cookiebuild: "commerce-v1", rotation: rotationId, replaces: previousId },
      }, { idempotencyKey: `bootstrap-webhook-rotate:${rotationId}` });
      revealWebhookSecret(created.secret);
      if (previous.length) writeOutput(`PREVIOUS WEBHOOK REMAINS ACTIVE ${previousId}; deploy the replacement secret, verify signed delivery, then retire this endpoint.\n`);
    }
  } else {
    const intentionalOverlap = endpointMatches.length === 2 && endpointMatches.some((replacement) =>
      replacement.metadata?.cookiebuild === "commerce-v1" && replacement.metadata?.rotation
      && endpointMatches.some((previous) => previous.id === replacement.metadata.replaces
        && previous.metadata?.cookiebuild === "commerce-v1"));
    if (endpointMatches.length > 1 && !intentionalOverlap) {
      throw new Error(`Duplicate enabled webhook endpoints for ${webhookUrl}`);
    }
    if (endpointMatches.length) {
      for (const endpoint of endpointMatches) {
        log("sync webhook", endpoint.id);
        const payload = { enabled_events: webhookEvents, metadata: { ...endpoint.metadata, cookiebuild: "commerce-v1" } };
        if (apply) await stripe.webhookEndpoints.update(endpoint.id, payload,
          { idempotencyKey: updateKey(`bootstrap-webhook-update:${endpoint.id}`, payload) });
      }
    } else {
      log("create webhook", webhookUrl);
      if (apply) {
        const created = await stripe.webhookEndpoints.create({ url: webhookUrl, enabled_events: webhookEvents, metadata: { cookiebuild: "commerce-v1" } }, { idempotencyKey: "bootstrap-webhook-create:commerce-v1" });
        revealWebhookSecret(created.secret);
      }
    }
  }
  writeOutput(`${apply ? "Bootstrap applied" : "Dry-run complete; pass --apply to mutate Stripe"}.\n`);
  } finally {
    process.off("exit", closeSecretFile);
    closeSecretFile();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await bootstrapStripeCommerce();
}
