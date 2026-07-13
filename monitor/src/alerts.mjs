export class AlertState {
  constructor({ failureThreshold = 3, reminderMs = 6 * 60 * 60 * 1_000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.reminderMs = reminderMs;
  }

  update(previous = {}, result, now = Date.now()) {
    if (result.ok) {
      const recovery = Boolean(previous.alertedDown);
      return {
        state: {
          status: "healthy",
          failures: 0,
          alertedDown: false,
          changedAt: previous.status === "healthy" ? previous.changedAt : now,
          lastAlertAt: previous.lastAlertAt ?? null,
          lastSuccessAt: now,
          lastError: null,
          details: result,
        },
        action: recovery ? "recovered" : null,
      };
    }

    const failures = Number(previous.failures ?? 0) + 1;
    const confirmed = failures >= this.failureThreshold;
    const reminderDue = previous.alertedDown
      && now - Number(previous.lastAlertAt ?? 0) >= this.reminderMs;
    const action = confirmed && (!previous.alertedDown || reminderDue) ? "failed" : null;
    return {
      state: {
        status: confirmed ? "unhealthy" : "degraded",
        failures,
        alertedDown: previous.alertedDown || confirmed,
        changedAt: previous.status === (confirmed ? "unhealthy" : "degraded") ? previous.changedAt : now,
        lastAlertAt: action ? now : previous.lastAlertAt ?? null,
        lastSuccessAt: previous.lastSuccessAt ?? null,
        lastError: result.error,
        details: result,
      },
      action,
    };
  }
}

export async function sendDiscord(webhookUrl, content) {
  if (!webhookUrl) return false;
  const response = await fetch(webhookUrl, {
    method: "POST",
    signal: AbortSignal.timeout(8_000),
    headers: { "content-type": "application/json", "user-agent": "CookieBuild-Monitor/1.0" },
    body: JSON.stringify({
      username: "Cookie Build Monitor",
      content: content.slice(0, 1_950),
      allowed_mentions: { parse: [] },
    }),
  });
  if (!response.ok) throw new Error(`Discord webhook returned HTTP ${response.status}`);
  return true;
}
