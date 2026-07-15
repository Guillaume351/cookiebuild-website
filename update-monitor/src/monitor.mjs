import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { collectSources } from './sources.mjs'
import { enrichResults, renderAiPrompt, renderMarkdown } from './report.mjs'
import { pruneState } from './state-store.mjs'
import { safeError, sanitizeText, sanitizeValue } from './sanitize.mjs'

const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/

export class MonitorError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.status = status
  }
}

async function atomicWrite(file, content) {
  await mkdir(dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, content, { mode: 0o600 })
  await rename(temp, file)
}

async function loadInstalled(config) {
  let value = config.installedJson
  if (config.installedFile) value = await readFile(config.installedFile, 'utf8')
  if (!value) return {}
  const installed = JSON.parse(value)
  if (!installed || Array.isArray(installed) || typeof installed !== 'object') throw new Error('Installed versions must be a JSON object')
  return Object.fromEntries(Object.entries(installed).filter(([, version]) => typeof version === 'string' && version.length <= 128))
}

function alertHash(run) {
  const stable = run.results.map(({ id, installed, target, status }) => ({ id, installed, target, status }))
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex')
}

async function sendWebhook(url, run) {
  const updates = run.results.filter((item) => item.updateAvailable && item.sourceUp !== false)
  if (!url || updates.length === 0) return false
  const lines = updates.map((item) => `• ${item.name}: ${item.installed || 'inconnu'} → ${item.target} (${item.changelogUrl})`)
  const content = sanitizeText(`Cookie Build — mises à jour détectées\n${lines.join('\n')}`, 1_900)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'CookieBuild-UpdateMonitor/1.0' },
      body: JSON.stringify({ username: 'Cookie Build updates', allowed_mentions: { parse: [] }, content }),
      signal: controller.signal,
      redirect: 'error',
    })
    if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`)
    return true
  } finally {
    clearTimeout(timeout)
  }
}

export class UpdateMonitor {
  constructor({ config, store, collect = collectSources, now = () => Date.now() }) {
    this.config = config
    this.store = store
    this.collect = collect
    this.now = now
  }

  async begin(idempotencyKey, trigger) {
    if (!IDEMPOTENCY_PATTERN.test(idempotencyKey || '')) throw new MonitorError('A valid Idempotency-Key is required', 400)
    const now = this.now()
    return this.store.mutate((state) => {
      pruneState(state, now)
      const previous = state.checkIdempotency[idempotencyKey]
      if (previous) {
        if (previous.status === 'complete' && state.lastRun?.checkedAt === previous.checkedAt) return { replay: true, run: state.lastRun }
        if (previous.status === 'failed') throw new MonitorError('The previous idempotent check failed', 409)
        throw new MonitorError('This idempotent check is still running', 409)
      }
      if (state.checkLock) throw new MonitorError('Another update check is already running', 423)
      const operationId = randomUUID()
      state.checkLock = { operationId, trigger: sanitizeText(trigger, 100), startedAt: new Date(now).toISOString(), expiresAt: now + 600_000 }
      state.checkIdempotency[idempotencyKey] = { operationId, status: 'running', expiresAt: now + 86_400_000 }
      return { replay: false, operationId }
    })
  }

  async finish(idempotencyKey, operationId, status, run) {
    const now = this.now()
    await this.store.mutate((state) => {
      const entry = state.checkIdempotency[idempotencyKey]
      if (entry?.operationId === operationId) Object.assign(entry, { status, checkedAt: run?.checkedAt || null, expiresAt: now + 86_400_000 })
      if (state.checkLock?.operationId === operationId) state.checkLock = null
    })
  }

  async run({ idempotencyKey, trigger = 'manual' }) {
    const started = await this.begin(idempotencyKey, trigger)
    if (started.replay) return { ...started.run, replayed: true }
    try {
      const installed = await loadInstalled(this.config)
      const results = enrichResults(await this.collect(this.config, this.store), installed)
      const checkedAt = new Date(this.now()).toISOString()
      const successfulSources = results.filter((item) => item.ok && item.sourceUp !== false).length
      const run = sanitizeValue({ checkedAt, trigger, operationId: started.operationId, successfulSources, totalSources: results.length, results })
      const markdown = renderMarkdown(run)
      const prompt = renderAiPrompt(run)
      await Promise.all([atomicWrite(this.config.reportFile, `${markdown}\n`), atomicWrite(this.config.promptFile, prompt)])

      const hash = alertHash(run)
      const stateBeforeAlert = await this.store.read()
      let webhookSent = false
      let webhookError = null
      if (this.config.webhookUrl && hash !== stateBeforeAlert.lastAlertHash && results.some((item) => item.updateAvailable && item.sourceUp !== false)) {
        try {
          webhookSent = await sendWebhook(this.config.webhookUrl, run)
        } catch (error) {
          webhookError = safeError(error)
        }
      }

      await this.store.mutate((state) => {
        state.lastRun = { ...run, webhookSent, webhookError }
        if (successfulSources > 0) state.lastSuccessfulRunAt = checkedAt
        for (const result of results) {
          state.sources[result.id] ||= {}
          state.sources[result.id].lastResult = result
          state.sources[result.id].lastCheckedAt = checkedAt
        }
        if (webhookSent) state.lastAlertHash = hash
      })
      await this.finish(idempotencyKey, started.operationId, successfulSources > 0 ? 'complete' : 'failed', run)
      if (successfulSources === 0) throw new MonitorError('All update sources failed', 503)
      return { ...run, webhookSent, webhookError }
    } catch (error) {
      await this.store.mutate((state) => {
        state.runFailuresTotal = (state.runFailuresTotal || 0) + 1
      })
      await this.finish(idempotencyKey, started.operationId, 'failed', null)
      throw error
    }
  }

  async status() {
    const state = await this.store.read()
    return sanitizeValue({ lastRun: state.lastRun, lastSuccessfulRunAt: state.lastSuccessfulRunAt, checkInProgress: state.checkLock ? { trigger: state.checkLock.trigger, startedAt: state.checkLock.startedAt } : null })
  }

  async health() {
    const state = await this.store.read()
    const lastSuccess = Date.parse(state.lastSuccessfulRunAt || '')
    const ageMs = Number.isFinite(lastSuccess) ? this.now() - lastSuccess : null
    const ok = ageMs != null && ageMs <= this.config.staleAfterMs && state.lastRun?.successfulSources > 0
    return { ok, ageMs, lastSuccessfulRunAt: state.lastSuccessfulRunAt, successfulSources: state.lastRun?.successfulSources || 0 }
  }

  async report() {
    return readFile(this.config.reportFile, 'utf8')
  }

  async prompt() {
    return readFile(this.config.promptFile, 'utf8')
  }

  async metrics() {
    const state = await this.store.read()
    const results = state.lastRun?.results || []
    const prefix = 'cookiebuild'
    const lines = [
      `# HELP ${prefix}_update_monitor_source_up Whether the upstream source last succeeded.`,
      `# TYPE ${prefix}_update_monitor_source_up gauge`,
    ]
    for (const item of results) lines.push(`cookiebuild_update_monitor_source_up{component="${item.id}"} ${item.ok && item.sourceUp !== false ? 1 : 0}`)
    lines.push(`# HELP ${prefix}_update_available Whether a newer stable version is available.`, `# TYPE ${prefix}_update_available gauge`)
    for (const item of results) lines.push(`cookiebuild_update_available{component="${item.id}"} ${item.updateAvailable ? 1 : 0}`)
    lines.push(`# HELP ${prefix}_update_monitor_last_success_timestamp_seconds Unix timestamp of the last partially or fully successful check.`, `# TYPE ${prefix}_update_monitor_last_success_timestamp_seconds gauge`, `cookiebuild_update_monitor_last_success_timestamp_seconds ${state.lastSuccessfulRunAt ? Math.floor(Date.parse(state.lastSuccessfulRunAt) / 1000) : 0}`)
    lines.push(`# HELP ${prefix}_update_monitor_run_failures_total Number of failed monitor runs.`, `# TYPE ${prefix}_update_monitor_run_failures_total counter`, `cookiebuild_update_monitor_run_failures_total ${state.runFailuresTotal || 0}`, '')
    return lines.join('\n')
  }
}

export const internals = { atomicWrite, loadInstalled, alertHash, sendWebhook }
