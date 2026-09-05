import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres, { type Sql } from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "../db/schema";

const databaseUrl = process.env.COMMERCE_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const testSchema = "commerce_lifecycle_" + randomUUID().replaceAll("-", "");

integration("commerce worker lifecycle against PostgreSQL", () => {
  let client: Sql;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let handlers: typeof import("../server/services/commerce-webhook")["commerceWebhookInternals"];
  let commerce: typeof import("../server/services/commerce");

  beforeAll(async () => {
    const setup = postgres(databaseUrl!, { max: 1 });
    await setup.unsafe(`CREATE SCHEMA "${testSchema}"`);
    await setup.end();
    const scoped = new URL(databaseUrl!);
    scoped.searchParams.set("search_path", testSchema);
    client = postgres(scoped.toString(), { prepare: false, max: 8, onnotice: () => {} });
    await client.unsafe(`CREATE TABLE playerdata (id uuid PRIMARY KEY, name varchar(255));
      CREATE TABLE player_link_challenges (id uuid PRIMARY KEY, player_id uuid REFERENCES playerdata(id), edition varchar(16),
        code_hmac varchar(64), expires_at timestamptz, consumed_at timestamptz, created_at timestamptz DEFAULT now());`);
    for (const file of ["0015_cosmetic_entitlements.sql", "0016_stripe_commerce.sql", "0017_free_cookie_sparkles.sql"]) {
      await client.unsafe((await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8")).replaceAll("--> statement-breakpoint", ""));
    }
    db = drizzle(client, { schema });
    vi.doMock("../db/client", () => ({ default: db, postgresClient: client }));
    handlers = (await import("../server/services/commerce-webhook")).commerceWebhookInternals;
    commerce = await import("../server/services/commerce");
  });
  afterAll(async () => {
    await client?.end({ timeout: 2 });
    const cleanup = postgres(databaseUrl!, { max: 1, onnotice: () => {} });
    await cleanup.unsafe(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
    await cleanup.end();
    vi.doUnmock("../db/client");
  });

  async function fixture(access = "permanent") {
    const playerId = randomUUID(); const id = randomUUID();
    await client`INSERT INTO playerdata(id,name) VALUES (${playerId},'CommerceFixture')`;
    const [order] = await db.insert(schema.commerceOrders).values({
      id, playerId, productId: access === "subscription" ? "supporter_monthly" : "supporter_permanent", productVersion: 1,
      productName: "Supporter", access, grantsSnapshot: ["supporter_badge"], amountTtcCents: access === "subscription" ? 100 : 499,
      currency: "EUR", stripeMode: "test", entitlementSource: `stripe:order:${id}`, consumerNoticeVersion: "test-v1", consumerNoticeText: "Test consent",
      termsAcceptedAt: new Date(), stripeCustomerId: `cus_${id}`, status: "created",
    }).returning();
    return order!;
  }
  const metadata = (order: typeof schema.commerceOrders.$inferSelect) => ({ cookiebuild_order_id: order.id, cookiebuild_player_id: order.playerId,
    cookiebuild_product_id: order.productId, cookiebuild_product_version: "1" });
  const price = (order: typeof schema.commerceOrders.$inferSelect) => ({ lookup_key: `cookiebuild_${order.productId}_eur_v1`, currency: "eur",
    unit_amount: order.amountTtcCents, type: order.access === "subscription" ? "recurring" : "one_time", tax_behavior: "inclusive" });
  const checkout = (order: typeof schema.commerceOrders.$inferSelect) => ({ id: `cs_${order.id}`, object: "checkout.session", metadata: metadata(order),
    customer: order.stripeCustomerId, amount_total: order.amountTtcCents, currency: "eur", payment_status: "paid", created: Math.floor(Date.now()/1000),
    payment_intent: `pi_${order.id}`, line_items: { data: [{ quantity: 1, price: price(order) }] } });
  const invoice = (order: typeof schema.commerceOrders.$inferSelect, suffix: string, days: number) => ({
    id: `in_${order.id}_${suffix}`, metadata: metadata(order), customer: order.stripeCustomerId, status: "paid", amount_paid: 100, currency: "eur",
    payment_intent: `pi_${order.id}_${suffix}`, charge: `ch_${order.id}_${suffix}`, status_transitions: { paid_at: Math.floor(Date.now()/1000) },
    lines: { data: [{ quantity: 1, _price: price(order), period: { end: Math.floor(Date.now()/1000) + days * 86400 } }] },
    _subscription: { id: `sub_${order.id}`, metadata: metadata(order), status: "active", current_period_end: Math.floor(Date.now()/1000) + 60 * 86400 },
  });
  const apply = (type: string, object: any, eventId = "evt_" + randomUUID()) => db.transaction((tx) => handlers.applyStripeEvent(tx,
    { id: eventId, type, livemode: false } as any, { ...object, _eventLivemode: false }));
  const activeGrants = (playerId: string) => client`SELECT *, expires_at AT TIME ZONE 'UTC' AS expires_at FROM cosmetic_entitlements WHERE player_id=${playerId} AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now())`;

  it.each(["raced-success", "lost-response"])("keeps a Checkout safe after %s", async (scenario) => {
    const playerId = randomUUID();
    await client`INSERT INTO playerdata(id,name) VALUES (${playerId}, 'CheckoutFixture')`;
    const stripeUtils = await import("../server/utils/stripe-commerce");
    const originalEnv = { ...process.env };
    Object.assign(process.env, { NODE_ENV: "test", COMMERCE_STRIPE_MODE: "test", STRIPE_SECRET_KEY: "rk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture",
      COMMERCE_PUBLIC_BASE_URL: "http://localhost:3000", COMMERCE_STRIPE_AUTOMATIC_TAX: "false", COMMERCE_LEGAL_NAME: "Fixture",
      COMMERCE_LEGAL_ADDRESS: "Fixture", COMMERCE_SUPPORT_EMAIL: "fixture@example.com", COMMERCE_BUSINESS_STATUS: "test", COMMERCE_VAT_STATUS: "not_applicable" });
    let createdOrderId = "";
    const fakeStripe = {
      prices: { list: async () => ({ data: [{ id: "price_fixture", active: true, livemode: false, lookup_key: "cookiebuild_supporter_permanent_eur_v1",
        currency: "eur", unit_amount: 499, tax_behavior: "inclusive", type: "one_time", product: { metadata: { cookiebuild_product_id: "supporter_permanent",
          cookiebuild_product_version: "1", cookiebuild_access: "permanent", cookiebuild_grants: "supporter_badge" } } }] }) },
      customers: { create: async () => ({ id: `cus_${playerId}` }) },
      checkout: { sessions: { create: async (input: any) => {
        expect(input.expires_at - Math.floor(Date.now() / 1000)).toBeGreaterThan(1800);
        createdOrderId = input.metadata.cookiebuild_order_id;
        if (scenario === "lost-response") throw new Error("Fixture connection closed after Stripe accepted the request");
        const [order] = await db.select().from(schema.commerceOrders).where(eq(schema.commerceOrders.id, createdOrderId));
        await apply("checkout.session.completed", checkout(order!));
        return { id: `cs_${createdOrderId}`, url: "https://checkout.stripe.com/fixture" };
      } } },
    };
    stripeUtils.setStripeClientForTests(fakeStripe as any);
    const auth = { playerId, playerName: "CheckoutFixture" } as any;
    const input = { productId: "supporter_permanent", termsAccepted: true, immediatePerformanceConsent: true, withdrawalWaiverAcknowledged: true };
    try {
      if (scenario === "lost-response") {
        await expect(commerce.createCommerceCheckout(auth, input)).rejects.toThrow(/connection closed/);
        await expect(commerce.createCommerceCheckout(auth, input)).rejects.toMatchObject({ statusCode: 409 });
      } else await expect(commerce.createCommerceCheckout(auth, input)).resolves.toMatchObject({ url: "https://checkout.stripe.com/fixture" });
      const [order] = await db.select().from(schema.commerceOrders).where(eq(schema.commerceOrders.id, createdOrderId));
      expect(order?.status).toBe(scenario === "lost-response" ? "created" : "paid");
      expect(await activeGrants(playerId)).toHaveLength(scenario === "lost-response" ? 0 : 1);
      if (scenario === "raced-success") expect(order?.stripeCheckoutSessionId).toBe(`cs_${createdOrderId}`);
    } finally { stripeUtils.setStripeClientForTests(null); process.env = originalEnv; }
  });

  it("never resurrects a fully refunded one-time invoice when Checkout arrives late", async () => {
    const order = await fixture();
    await apply("refund.updated", { id: "re_"+order.id, metadata: metadata(order), status: "succeeded", amount: 499, currency: "eur",
      payment_intent: `pi_${order.id}`, charge: `ch_${order.id}`, _charge: { id: `ch_${order.id}`, amount: 499, amount_refunded: 499, invoice: `in_${order.id}` } });
    await apply("checkout.session.completed", checkout(order));
    expect(await activeGrants(order.playerId)).toHaveLength(0);
    const [payment] = await db.select().from(schema.commercePayments).where(eq(schema.commercePayments.orderId, order.id));
    expect(payment).toMatchObject({ status: "refunded", entitlementSource: order.entitlementSource });
  });

  it("serializes concurrent distinct success events into one payment and one entitlement", async () => {
    const order = await fixture();
    await Promise.all([apply("checkout.session.completed", checkout(order)), apply("checkout.session.async_payment_succeeded", checkout(order))]);
    expect(await activeGrants(order.playerId)).toHaveLength(1);
    expect(await db.select().from(schema.commercePayments).where(eq(schema.commercePayments.orderId, order.id))).toHaveLength(1);
  });

  it("refuses another customer's or player's Checkout without granting anything", async () => {
    const order = await fixture();
    await expect(apply("checkout.session.completed", { ...checkout(order), customer: "cus_someone_else" })).rejects.toThrow(/customer conflicts/);
    await expect(apply("checkout.session.completed", { ...checkout(order), metadata: { ...metadata(order), cookiebuild_player_id: randomUUID() } })).rejects.toThrow(/player identity conflicts/);
    expect(await activeGrants(order.playerId)).toHaveLength(0);
  });

  it("keeps each paid invoice's coverage and does not revive a canceled subscription from a stale success", async () => {
    const order = await fixture("subscription");
    const old = invoice(order, "old", 30); const recent = invoice(order, "new", 60);
    await apply("invoice.paid", recent); await apply("invoice.paid", old);
    const grants = await activeGrants(order.playerId);
    expect(grants).toHaveLength(2);
    expect(new Set(grants.map(g => new Date(g.expires_at).getTime())).size).toBe(2);
    await apply("customer.subscription.deleted", { ...recent._subscription, status: "canceled", ended_at: Math.floor(Date.now()/1000) });
    await apply("invoice.paid", invoice(order, "late", 90));
    expect(await activeGrants(order.playerId)).toHaveLength(0);
    expect((await db.select().from(schema.commerceOrders).where(eq(schema.commerceOrders.id, order.id)))[0]?.status).toBe("canceled");
  });

  it("refunds only the concerned invoice restoration and preserves a different paid period", async () => {
    const order = await fixture("subscription");
    const first = invoice(order,"first",30); const second = invoice(order,"second",60);
    for (const inv of [first,second]) {
      await apply("invoice.paid",inv);
      const dispute = { id:`dp_${inv.id}`,metadata:metadata(order),amount:100,currency:"eur",charge:inv.charge,
        _charge:{id:inv.charge,payment_intent:inv.payment_intent,invoice:inv.id,amount:100},_invoice:inv };
      await apply("charge.dispute.created",{...dispute,status:"needs_response"});
      await apply("charge.dispute.closed",{...dispute,status:"won"});
    }
    expect(await activeGrants(order.playerId)).toHaveLength(2);
    await apply("refund.updated",{id:`re_${first.id}`,metadata:metadata(order),status:"succeeded",amount:100,currency:"eur",
      payment_intent:first.payment_intent,charge:first.charge,_charge:{id:first.charge,invoice:first.id,amount:100,amount_refunded:100}});
    const remaining=await activeGrants(order.playerId);
    expect(remaining).toHaveLength(1);
    expect(new Date(remaining[0]!.expires_at).getTime()).toBe(second.lines.data[0]!.period.end*1000);
  });

  it("provides free sparkles without a purchase or grant and keeps paid access protected", async () => {
    const playerId = randomUUID();
    await client`INSERT INTO playerdata(id,name) VALUES (${playerId}, 'FreeSparklesFixture')`;
    const inventory = await commerce.commerceInventory(playerId);
    expect(inventory.entitlements).toEqual([expect.objectContaining({ cosmeticId: "cookie_sparkle_trail", grantedAt: null, expiresAt: null })]);
    expect(await activeGrants(playerId)).toHaveLength(0);
    expect((await commerce.selectCommerceCosmetic(playerId, { slot: "HUB_TRAIL", cosmeticId: "cookie_sparkle_trail" })).selections)
      .toEqual([expect.objectContaining({ slot: "HUB_TRAIL", cosmeticId: "cookie_sparkle_trail" })]);
    await expect(commerce.selectCommerceCosmetic(playerId, { slot: "HUB_TRAIL", cosmeticId: "cookie_crumb_trail" })).rejects.toMatchObject({ statusCode: 403 });
    await expect(commerce.selectCommerceCosmetic(playerId, { slot: "BADGE", cosmeticId: "cookie_sparkle_trail" })).rejects.toMatchObject({ statusCode: 400 });
    expect((await commerce.selectCommerceCosmetic(playerId, { slot: "HUB_TRAIL", cosmeticId: null })).selections).toHaveLength(0);
    expect(await activeGrants(playerId)).toHaveLength(0);
    // Replaying the new migration must retain the persisted free selection and pair constraints.
    await commerce.selectCommerceCosmetic(playerId, { slot: "HUB_TRAIL", cosmeticId: "cookie_sparkle_trail" });
    await client.unsafe((await readFile(new URL("../drizzle/0017_free_cookie_sparkles.sql", import.meta.url), "utf8")).replaceAll("--> statement-breakpoint", ""));
    expect((await commerce.commerceInventory(playerId)).selections).toHaveLength(1);
    await client`INSERT INTO cosmetic_entitlements(player_id,cosmetic_id,source,granted_at,revoked_at)
      VALUES (${playerId}, 'cookie_sparkle_trail', 'fixture:historical', now() - interval '1 day', now())`;
    expect((await commerce.commerceInventory(playerId)).entitlements).toEqual([
      expect.objectContaining({ cosmeticId: "cookie_sparkle_trail", grantedAt: null, expiresAt: null }),
    ]);
    expect((await commerce.selectCommerceCosmetic(playerId, { slot: "HUB_TRAIL", cosmeticId: "cookie_sparkle_trail" })).selections).toHaveLength(1);
  });

  it("only equips an owned active item in its canonical slot and can clear it", async () => {
    const order=await fixture();
    await expect(commerce.selectCommerceCosmetic(order.playerId,{slot:"JOIN_FLAIR",cosmeticId:null})).rejects.toMatchObject({statusCode:400});
    await expect(commerce.selectCommerceCosmetic(order.playerId,{slot:"BADGE",cosmeticId:"supporter_badge"})).rejects.toMatchObject({statusCode:403});
    await apply("checkout.session.completed",checkout(order));
    await expect(commerce.selectCommerceCosmetic(order.playerId,{slot:"HUB_TRAIL",cosmeticId:"supporter_badge"})).rejects.toMatchObject({statusCode:400});
    expect((await commerce.selectCommerceCosmetic(order.playerId,{slot:"BADGE",cosmeticId:"supporter_badge"})).selections).toHaveLength(1);
    expect((await commerce.selectCommerceCosmetic(order.playerId,{slot:"BADGE",cosmeticId:null})).selections).toHaveLength(0);
  });
  it("does not restore a fully refunded payment when dispute events arrive later", async () => {
    const order=await fixture(); await apply("checkout.session.completed",checkout(order));
    const charge={id:`ch_${order.id}`,payment_intent:`pi_${order.id}`,amount:499,amount_refunded:499};
    await apply("refund.updated",{id:`re_${order.id}`,metadata:metadata(order),status:"succeeded",amount:499,currency:"eur",payment_intent:charge.payment_intent,charge:charge.id,_charge:charge});
    const dispute={id:`dp_${order.id}`,metadata:metadata(order),amount:499,charge:charge.id,_charge:charge};
    await apply("charge.dispute.created",{...dispute,status:"needs_response"});
    await apply("charge.dispute.closed",{...dispute,status:"won"});
    expect(await activeGrants(order.playerId)).toHaveLength(0);
    expect((await db.select().from(schema.commercePayments).where(eq(schema.commercePayments.orderId,order.id)))[0]?.status).toBe("refunded");
  });

  it("preserves partial refunds through delayed checkout success", async () => {
    const order=await fixture(); await apply("checkout.session.completed",checkout(order));
    await apply("refund.updated",{id:`re_${order.id}`,metadata:metadata(order),status:"succeeded",amount:100,currency:"eur",payment_intent:`pi_${order.id}`,charge:`ch_${order.id}`,
      _charge:{id:`ch_${order.id}`,amount:499,amount_refunded:100}});
    await apply("checkout.session.completed",checkout(order));
    expect((await db.select().from(schema.commerceOrders).where(eq(schema.commerceOrders.id,order.id)))[0]?.status).toBe("partially_refunded");
    expect((await db.select().from(schema.commercePayments).where(eq(schema.commercePayments.orderId,order.id)))[0]?.status).toBe("partially_refunded");
    expect(await activeGrants(order.playerId)).toHaveLength(1);
  });

  it("a reclaimed worker token cannot apply a canonical event or finish someone else's claim", async () => {
    const order=await fixture(); const worker=await import("../server/services/commerce-webhook");
    const id="evt_"+randomUUID();
    await db.insert(schema.commerceWebhookEvents).values({stripeEventId:id,eventType:"checkout.session.completed",livemode:false});
    const [claimed]=await worker.claimCommerceWebhookEvents(1);
    const replacement=randomUUID();
    await db.update(schema.commerceWebhookEvents).set({lockToken:replacement}).where(eq(schema.commerceWebhookEvents.stripeEventId,id));
    const stripe={events:{retrieve:async()=>({id,type:"checkout.session.completed",livemode:false,data:{object:checkout(order)}})},checkout:{sessions:{retrieve:async()=>checkout(order)}}};
    const prior=process.env.COMMERCE_STRIPE_MODE;process.env.COMMERCE_STRIPE_MODE="test";
    try { expect(await worker.processCommerceWebhookEvent(claimed!,stripe as any)).toBe(false); }
    finally { if(prior===undefined)delete process.env.COMMERCE_STRIPE_MODE;else process.env.COMMERCE_STRIPE_MODE=prior; }
    expect(await activeGrants(order.playerId)).toHaveLength(0);
    expect((await db.select().from(schema.commerceWebhookEvents).where(eq(schema.commerceWebhookEvents.stripeEventId,id)))[0]).toMatchObject({status:"processing",lockToken:replacement});
  });

  it("delivers a permanent purchase from its paid invoice when the Checkout event was lost", async () => {
    const order = await fixture();
    const paidInvoice = { ...invoice(order, "single", 30), amount_paid: 499, _subscription: undefined,
      payment_intent: `pi_${order.id}`, charge: `ch_${order.id}` };
    await apply("invoice.paid", paidInvoice);
    expect(await activeGrants(order.playerId)).toHaveLength(1);
    expect((await db.select().from(schema.commerceOrders).where(eq(schema.commerceOrders.id, order.id)))[0]?.status).toBe("paid");
    await apply("refund.updated", { id: `re_${order.id}`, metadata: metadata(order), status: "succeeded", amount: 499, currency: "eur",
      payment_intent: paidInvoice.payment_intent, charge: paidInvoice.charge,
      _charge: { id: paidInvoice.charge, amount: 499, amount_refunded: 499, invoice: paidInvoice.id } });
    await apply("invoice.paid", paidInvoice);
    expect(await activeGrants(order.playerId)).toHaveLength(0);
  });

  it("never submits a withdrawal from a different Stripe environment", async () => {
    const order = await fixture("subscription");
    await apply("invoice.paid", invoice(order, "first", 30));
    const [payment] = await db.select().from(schema.commercePayments).where(eq(schema.commercePayments.orderId, order.id));
    await db.update(schema.commerceOrders).set({ withdrawalStatus: "requested", withdrawalPaymentId: payment!.id }).where(eq(schema.commerceOrders.id, order.id));
    const prior = process.env.COMMERCE_STRIPE_MODE; process.env.COMMERCE_STRIPE_MODE = "live";
    try {
      expect(await commerce.processPendingSubscriptionWithdrawals()).toEqual({ pending: 0, submitted: 0 });
      await expect(commerce.requestSubscriptionWithdrawal({ playerId: order.playerId } as any, order.id)).rejects.toMatchObject({ statusCode: 409 });
    } finally { if (prior === undefined) delete process.env.COMMERCE_STRIPE_MODE; else process.env.COMMERCE_STRIPE_MODE = prior; }
    expect((await db.select().from(schema.commerceOrders).where(eq(schema.commerceOrders.id, order.id)))[0]?.withdrawalStatus).toBe("requested");
  });

  it("acknowledges an unrelated account event without endlessly retrying or creating commerce rows", async () => {
    const worker = await import("../server/services/commerce-webhook");
    const id = "evt_" + randomUUID();
    const unrelated = { id: "cs_unrelated", object: "checkout.session", metadata: {}, customer: "cus_unrelated" };
    await db.insert(schema.commerceWebhookEvents).values({ stripeEventId: id, eventType: "checkout.session.completed", livemode: false });
    const [claimed] = await worker.claimCommerceWebhookEvents(1);
    const stripe = { events: { retrieve: async () => ({ id, type: "checkout.session.completed", livemode: false, data: { object: unrelated } }) },
      checkout: { sessions: { retrieve: async () => unrelated } } };
    const prior = process.env.COMMERCE_STRIPE_MODE; process.env.COMMERCE_STRIPE_MODE = "test";
    try { expect(await worker.processCommerceWebhookEvent(claimed!, stripe as any)).toBe(true); }
    finally { if (prior === undefined) delete process.env.COMMERCE_STRIPE_MODE; else process.env.COMMERCE_STRIPE_MODE = prior; }
    expect((await db.select().from(schema.commerceWebhookEvents).where(eq(schema.commerceWebhookEvents.stripeEventId, id)))[0]?.status).toBe("processed");
  });

  it("recovers a lost Checkout response by queuing the canonical event without granting directly", async () => {
    const order=await fixture(); const worker=await import("../server/services/commerce-webhook");
    const old=new Date(Date.now()-5*60_000);
    await db.update(schema.commerceOrders).set({createdAt:old,updatedAt:old}).where(eq(schema.commerceOrders.id,order.id));
    const session={...checkout(order),livemode:false,status:"complete"};
    const event={id:"evt_"+randomUUID(),type:"checkout.session.completed",livemode:false,data:{object:session}};
    const stripe={checkout:{sessions:{list:async()=>({data:[session],has_more:false})}},events:{list:()=>({autoPagingToArray:async()=>[event]})}};
    const prior=process.env.COMMERCE_STRIPE_MODE;process.env.COMMERCE_STRIPE_MODE="test";
    try { expect(await worker.reconcilePendingCommerceCheckouts(stripe as any)).toMatchObject({recovered:1}); }
    finally { if(prior===undefined)delete process.env.COMMERCE_STRIPE_MODE;else process.env.COMMERCE_STRIPE_MODE=prior; }
    expect(await activeGrants(order.playerId)).toHaveLength(0);
    expect((await db.select().from(schema.commerceWebhookEvents).where(eq(schema.commerceWebhookEvents.stripeEventId,event.id)))[0]?.status).toBe("received");
    expect((await db.select().from(schema.commerceOrders).where(eq(schema.commerceOrders.id,order.id)))[0]?.stripeCheckoutSessionId).toBe(session.id);
  });

});
