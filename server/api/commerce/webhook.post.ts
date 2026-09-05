import { readCommerceWebhookBody } from "../../utils/commerce-webhook-body";
import db from "../../../db/client";
import { commerceWebhookEvents } from "../../../db/schema";
import { assertStripeLivemode, commerceStripeRuntimeAllowed, stripeClient, type CommerceMode } from "../../utils/stripe-commerce";

export default defineEventHandler(async (event) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const mode = process.env.COMMERCE_STRIPE_MODE?.trim() as CommerceMode | undefined;
  if (!webhookSecret?.startsWith("whsec_") || (mode !== "test" && mode !== "live") || !commerceStripeRuntimeAllowed()) {
    throw createError({ statusCode: 503, statusMessage: "Stripe webhook is not configured" });
  }
  const signature = getHeader(event, "stripe-signature");
  if (!signature) throw createError({ statusCode: 400, statusMessage: "Missing Stripe signature" });
  const rawBody = await readCommerceWebhookBody(event.node.req, getHeader(event, "content-length"));

  let stripeEvent;
  try {
    stripeEvent = stripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
    assertStripeLivemode(stripeEvent.livemode, mode);
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Invalid Stripe webhook signature or mode" });
  }
  const object = stripeEvent.data.object as { id?: string };
  await db.insert(commerceWebhookEvents).values({
    stripeEventId: stripeEvent.id,
    eventType: stripeEvent.type,
    objectId: object.id?.slice(0, 255) || null,
    livemode: stripeEvent.livemode,
  }).onConflictDoNothing();
  setResponseStatus(event, 202);
  return { accepted: true };
});
