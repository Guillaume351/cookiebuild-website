import { processCommerceWebhookBatch, reconcilePendingCommerceCheckouts } from "../services/commerce-webhook";
import { processPendingSubscriptionWithdrawals } from "../services/commerce";
import { commerceStripeRuntimeAllowed } from "../utils/stripe-commerce";

export default defineNitroPlugin((nitroApp) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.COMMERCE_STRIPE_MODE || !commerceStripeRuntimeAllowed()) return;
  let running = false;
  let reconciledAt = 0;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      if (Date.now() - reconciledAt >= 60_000) {
        await reconcilePendingCommerceCheckouts();
        reconciledAt = Date.now();
      }
      await processCommerceWebhookBatch(10);
      await processPendingSubscriptionWithdrawals(5);
    } catch (error) {
      console.error("Stripe commerce worker batch failed", {
        reason: error instanceof Error ? error.message : "unknown",
      });
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, 5_000);
  timer.unref?.();
  nitroApp.hooks.hook("close", () => clearInterval(timer));
  void tick();
});
