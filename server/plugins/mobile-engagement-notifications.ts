import { enqueueMobileEngagementNotifications } from "../services/mobile-engagement-notifications";

export default defineNitroPlugin((nitroApp) => {
  if (process.env.MOBILE_NOTIFICATION_WORKER_ENABLED !== "true") return;
  let running = false;
  let closed = false;
  const run = async () => {
    if (running || closed) return;
    running = true;
    try {
      const queued = await enqueueMobileEngagementNotifications();
      if (queued.daily + queued.weekly + queued.friendOnline + queued.workerFull + queued.objectiveReady > 0) {
        console.info("[mobile-engagement]", JSON.stringify({ event: "notifications_queued", ...queued }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[mobile-engagement]", JSON.stringify({
        event: "notification_sweep_failed",
        message: message.replace(/[\r\n\t]+/g, " ").slice(0, 500),
      }));
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void run(), 60_000);
  timer.unref();
  nitroApp.hooks.hook("close", () => {
    closed = true;
    clearInterval(timer);
  });
  void run();
});
