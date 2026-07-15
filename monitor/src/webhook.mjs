import { readFile } from "node:fs/promises";

/** Resolves only the dedicated incident webhook and never returns its value in logs. */
export async function loadAlertWebhook(env, read = readFile) {
  const direct = env.DISCORD_ALERT_WEBHOOK_URL?.trim();
  if (direct) {
    return { value: direct, source: "DISCORD_ALERT_WEBHOOK_URL" };
  }
  const file = env.DISCORD_ALERT_WEBHOOK_FILE?.trim();
  if (file) {
    try {
      const value = (await read(file, "utf8")).trim();
      if (value) {
        return { value, source: "DISCORD_ALERT_WEBHOOK_FILE" };
      }
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : "unknown";
      console.warn(`[alert webhook file unavailable] code=${code}`);
    }
  }
  return { value: "", source: "none" };
}
