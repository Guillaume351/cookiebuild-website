import { runSkyblockMaintenance } from "../services/skyblock-maintenance";

const DEFAULT_INTERVAL_MS = 5 * 60_000;

export default defineNitroPlugin((nitroApp) => {
  if (process.env.MOBILE_SKYBLOCK_MAINTENANCE_ENABLED?.trim().toLowerCase() !== "true") return;

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await runSkyblockMaintenance();
      if (Object.values(result).some((count) => count > 0)) {
        console.info("skyblock_maintenance_completed", result);
      }
    } catch (error) {
      console.error("skyblock_maintenance_failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    } finally {
      running = false;
    }
  };

  const interval = setInterval(run, DEFAULT_INTERVAL_MS);
  interval.unref();
  void run();
  nitroApp.hooks.hook("close", () => clearInterval(interval));
});
