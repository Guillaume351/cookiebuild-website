import {
  mobileNotificationWorkerConfig,
  processMobileNotificationOutbox,
} from "../services/mobile-notification-outbox";

function intervalMs() {
  const value = Number(process.env.MOBILE_NOTIFICATION_WORKER_INTERVAL_MS);
  // Player calls are intentionally short-lived. A five-second idle poll keeps
  // enqueue-to-Firebase latency bounded without increasing send concurrency.
  return Number.isInteger(value) && value >= 5_000 && value <= 300_000 ? value : 5_000;
}

export default defineNitroPlugin((nitroApp) => {
  if (process.env.MOBILE_NOTIFICATION_WORKER_ENABLED !== "true") return;

  const config = mobileNotificationWorkerConfig();
  const pollIntervalMs = intervalMs();
  let running = false;
  let closed = false;
  const run = async () => {
    if (running || closed) return;
    running = true;
    try {
      await processMobileNotificationOutbox(config);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[mobile-outbox]", JSON.stringify({
        event: "cycle_failed",
        message: message.replace(/[\r\n\t]+/g, " ").slice(0, 500),
      }));
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void run(), pollIntervalMs);
  timer.unref();
  nitroApp.hooks.hook("close", () => {
    closed = true;
    clearInterval(timer);
  });
  console.info("[mobile-outbox]", JSON.stringify({
    event: "worker_started",
    batchSize: config.batchSize,
    concurrency: config.concurrency,
    maxAttempts: config.maxAttempts,
    staleLockSeconds: config.staleLockSeconds,
    pollIntervalMs,
  }));
  void run();
});
