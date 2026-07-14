import { pruneExpiredMobileData } from "../services/mobile-data-retention";

const DAY_MS = 24 * 60 * 60 * 1_000;

export default defineNitroPlugin((nitroApp) => {
  if (process.env.MOBILE_RETENTION_WORKER_ENABLED === "false") return;

  let running = false;
  let closed = false;
  const run = async () => {
    if (running || closed) return;
    running = true;
    try {
      const acquired = await pruneExpiredMobileData();
      if (acquired) {
        console.info("[mobile-retention]", JSON.stringify({ event: "pruned" }));
      }
    } catch (error) {
      console.error("[mobile-retention]", JSON.stringify({
        event: "prune_failed",
        message: (error instanceof Error ? error.message : String(error))
          .replace(/[\r\n\t]+/g, " ")
          .slice(0, 500),
      }));
    } finally {
      running = false;
    }
  };

  const startup = setTimeout(() => void run(), 30_000);
  startup.unref();
  const timer = setInterval(() => void run(), DAY_MS);
  timer.unref();
  nitroApp.hooks.hook("close", () => {
    closed = true;
    clearTimeout(startup);
    clearInterval(timer);
  });
});
