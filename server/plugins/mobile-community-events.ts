import { ensureSoireeCookieEvents, soireeCookieEnabled } from "../services/mobile-community-events";

/**
 * Keeps the next two weeks of Soirée Cookie occurrences listed in mobile_events.
 * Inserts are idempotent (unique slug), so every replica may run this safely.
 */
export default defineNitroPlugin((nitroApp) => {
  if (!soireeCookieEnabled()) return;
  let closed = false;
  const run = async () => {
    if (closed) return;
    try {
      const created = await ensureSoireeCookieEvents();
      if (created > 0) {
        console.info("[community-events]", JSON.stringify({ event: "soiree_cookie_scheduled", created }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[community-events]", JSON.stringify({
        event: "soiree_cookie_schedule_failed",
        message: message.replace(/[\r\n\t]+/g, " ").slice(0, 500),
      }));
    }
  };
  const timer = setInterval(() => void run(), 60 * 60_000);
  timer.unref();
  nitroApp.hooks.hook("close", () => {
    closed = true;
    clearInterval(timer);
  });
  void run();
});
