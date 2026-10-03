import { announceSoireeOnDiscord, discordEventsWebhook } from "../services/discord-soiree-announcer";

/**
 * Posts Soirée Cookie announcements to Discord (T-60 min and start). Disabled
 * when DISCORD_EVENTS_WEBHOOK_URL is unset. Never logs the webhook URL.
 */
export default defineNitroPlugin((nitroApp) => {
  if (process.env.DISCORD_EVENTS_WEBHOOK_URL?.trim() && !discordEventsWebhook()) {
    console.error("[discord-events]", JSON.stringify({ event: "webhook_url_invalid" }));
    return;
  }
  if (!discordEventsWebhook()) return;
  let running = false;
  let closed = false;
  const run = async () => {
    if (running || closed) return;
    running = true;
    try {
      const posted = await announceSoireeOnDiscord();
      if (posted.length) console.info("[discord-events]", JSON.stringify({ event: "soiree_announced", keys: posted }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[discord-events]", JSON.stringify({
        event: "soiree_announce_failed",
        // fetch errors never include the URL, but scrub anything that looks like one.
        message: message.replace(/https?:\/\/\S+/g, "[url]").replace(/[\r\n\t]+/g, " ").slice(0, 300),
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
