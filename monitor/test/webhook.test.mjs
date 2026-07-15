import test from "node:test";
import assert from "node:assert/strict";

import { loadAlertWebhook } from "../src/webhook.mjs";

test("uses only the dedicated alert webhook", async () => {
  const result = await loadAlertWebhook({
    DISCORD_ALERT_WEBHOOK_URL: "https://example.invalid/dedicated",
    DISCORD_PLAYER_STATUS_WEBHOOK_URL: "https://example.invalid/join-logs",
  });

  assert.equal(result.source, "DISCORD_ALERT_WEBHOOK_URL");
  assert.match(result.value, /dedicated$/);
});

test("does not route incidents to the join-log fallback", async () => {
  const result = await loadAlertWebhook({
    DISCORD_PLAYER_STATUS_WEBHOOK_URL: "https://example.invalid/join-logs",
  });

  assert.deepEqual(result, { value: "", source: "none" });
});

test("reads a mounted alert secret file", async () => {
  const result = await loadAlertWebhook(
    { DISCORD_ALERT_WEBHOOK_FILE: "/run/secrets/discord_alert_webhook" },
    async () => "https://example.invalid/from-file\n",
  );

  assert.equal(result.source, "DISCORD_ALERT_WEBHOOK_FILE");
  assert.match(result.value, /from-file$/);
});
