import { readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'

function integer(value, fallback, min, max) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback
}

function absolutePath(value, fallback) {
  const path = value || fallback
  if (!isAbsolute(path)) throw new Error(`Expected an absolute path: ${path}`)
  return resolve(path)
}

export function loadConfig(env = process.env) {
  const secret = env.UPDATE_MONITOR_HMAC_SECRET || ''
  if (secret.length < 32) throw new Error('UPDATE_MONITOR_HMAC_SECRET must contain at least 32 characters')
  if (env.UPDATE_MONITOR_WEBHOOK_URL && env.UPDATE_MONITOR_WEBHOOK_FILE) {
    throw new Error('Configure UPDATE_MONITOR_WEBHOOK_URL or UPDATE_MONITOR_WEBHOOK_FILE, not both')
  }
  const webhookUrl = env.UPDATE_MONITOR_WEBHOOK_FILE
    ? readFileSync(absolutePath(env.UPDATE_MONITOR_WEBHOOK_FILE), 'utf8').trim()
    : env.UPDATE_MONITOR_WEBHOOK_URL || null
  if (webhookUrl) {
    const webhook = new URL(webhookUrl)
    if (webhook.protocol !== 'https:' || webhook.username || webhook.password) throw new Error('UPDATE_MONITOR_WEBHOOK_URL must be an HTTPS URL without userinfo')
  }
  return {
    host: env.UPDATE_MONITOR_HOST || '127.0.0.1',
    port: integer(env.UPDATE_MONITOR_PORT, 9420, 1, 65_535),
    secret,
    stateFile: absolutePath(env.UPDATE_MONITOR_STATE_FILE, '/state/update-monitor.json'),
    reportFile: absolutePath(env.UPDATE_MONITOR_REPORT_FILE, '/state/update-report.md'),
    promptFile: absolutePath(env.UPDATE_MONITOR_PROMPT_FILE, '/state/update-ai-prompt.txt'),
    installedFile: env.UPDATE_MONITOR_INSTALLED_FILE ? absolutePath(env.UPDATE_MONITOR_INSTALLED_FILE) : null,
    installedJson: env.UPDATE_MONITOR_INSTALLED_JSON || null,
    intervalMs: integer(env.UPDATE_MONITOR_INTERVAL_MS, 21_600_000, 60_000, 86_400_000),
    staleAfterMs: integer(env.UPDATE_MONITOR_STALE_AFTER_MS, 43_200_000, 60_000, 604_800_000),
    requestTimeoutMs: integer(env.UPDATE_MONITOR_REQUEST_TIMEOUT_MS, 15_000, 1_000, 60_000),
    maxBodyBytes: integer(env.UPDATE_MONITOR_MAX_BODY_BYTES, 32_768, 1_024, 1_048_576),
    authSkewMs: integer(env.UPDATE_MONITOR_AUTH_SKEW_MS, 60_000, 5_000, 600_000),
    nonceTtlMs: integer(env.UPDATE_MONITOR_NONCE_TTL_MS, 120_000, 60_000, 3_600_000),
    userAgent: env.UPDATE_MONITOR_USER_AGENT || 'CookieBuild-UpdateMonitor/1.0 (https://cookie-build.com)',
    githubToken: env.UPDATE_MONITOR_GITHUB_TOKEN || null,
    webhookUrl,
  }
}
