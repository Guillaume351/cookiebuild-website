import { bestOfRewardsEnabled, runWeeklyBestOf } from "../services/buildbattle-bestof";

/**
 * Weekly Build Battle best-of coins (Monday 10:00–10:59 Europe/Paris). Grants are
 * idempotent per ISO week, so every replica may run this; CookieDough's grant
 * poller delivers them in game. Disabled unless BB_GALLERY_BESTOF_REWARDS_ENABLED=true.
 */
export default defineNitroPlugin((nitroApp) => {
  if (!bestOfRewardsEnabled()) return;
  let running = false;
  let closed = false;
  const run = async () => {
    if (running || closed) return;
    running = true;
    try {
      const result = await runWeeklyBestOf();
      if (result.granted.length) {
        console.info("[bb-bestof]", JSON.stringify({ event: "bestof_granted", week: result.weekKey, grants: result.granted.length }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[bb-bestof]", JSON.stringify({
        event: "bestof_failed",
        message: message.replace(/[\r\n\t]+/g, " ").slice(0, 500),
      }));
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void run(), 5 * 60_000);
  timer.unref();
  nitroApp.hooks.hook("close", () => {
    closed = true;
    clearInterval(timer);
  });
  void run();
});
