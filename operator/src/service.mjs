import { appendFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { pruneState } from './state-store.mjs'
import { runCanaries } from './canaries.mjs'
import { safeError, sanitizeText, sanitizeValue } from './sanitize.mjs'

const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/

export class ActionError extends Error {
  constructor(message, status = 400, details) {
    super(message)
    this.name = 'ActionError'
    this.status = status
    this.details = details
  }
}

async function readMaintenance(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return { enabled: false }
    throw error
  }
}

async function setMaintenance(file, enabled, reason, actor = 'operator') {
  await mkdir(dirname(file), { recursive: true })
  if (!enabled) {
    await unlink(file).catch((error) => {
      if (error.code !== 'ENOENT') throw error
    })
    return { enabled: false }
  }
  const state = { enabled: true, reason: sanitizeText(reason || 'operator action', 500), actor, changedAt: new Date().toISOString() }
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
  await rename(temp, file)
  return state
}

function jsonPointer(value, pointer) {
  if (!pointer || pointer === '/') return value
  return pointer.split('/').slice(1).reduce((item, part) => item?.[part.replace(/~1/g, '/').replace(/~0/g, '~')], value)
}

async function fetchPlayerCount(config) {
  if (!config.monitorStatusUrl) {
    if (config.allowRestartWithoutMonitor) return { available: false, players: null, bypassed: true }
    throw new ActionError('Player monitor is not configured; restart is fail-closed', 503)
  }
  const url = new URL(config.monitorStatusUrl)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new ActionError('Player monitor URL is invalid', 500)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.monitorTimeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'error' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const players = jsonPointer(await response.json(), config.monitorPlayersPointer)
    if (!Number.isInteger(players) || players < 0) throw new Error('Player count is missing or invalid')
    return { available: true, players }
  } catch (error) {
    if (config.allowRestartWithoutMonitor) return { available: false, players: null, bypassed: true, error: safeError(error) }
    throw new ActionError('Player monitor unavailable; restart is fail-closed', 503, safeError(error))
  } finally {
    clearTimeout(timeout)
  }
}

async function guardRestart(config, request) {
  const playerState = await fetchPlayerCount(config)
  if ((playerState.players || 0) > 0) {
    const forceAllowed = config.allowForceWithPlayers && request.force === true && typeof request.reason === 'string' && request.reason.trim().length >= 8
    if (!forceAllowed) throw new ActionError(`Restart refused while ${playerState.players} player(s) are online`, 409, playerState)
    return { ...playerState, forced: true, reason: sanitizeText(request.reason, 500) }
  }
  return playerState
}

export class OperatorService {
  constructor({ config, store, adapter, now = () => Date.now() }) {
    this.config = config
    this.store = store
    this.adapter = adapter
    this.now = now
  }

  async audit(event) {
    await mkdir(dirname(this.config.auditFile), { recursive: true })
    const record = sanitizeValue({ at: new Date(this.now()).toISOString(), ...event })
    await appendFile(this.config.auditFile, `${JSON.stringify(record)}\n`, { mode: 0o600 })
  }

  async status() {
    const [service, maintenance, playerGuard] = await Promise.all([
      this.adapter.status().catch((error) => ({ ok: false, error: safeError(error) })),
      readMaintenance(this.config.maintenanceFile),
      fetchPlayerCount(this.config).catch((error) => ({ available: false, error: safeError(error) })),
    ])
    const state = await this.store.read()
    pruneState(state, this.now())
    return sanitizeValue({ ok: !service.error, service, maintenance, playerGuard, actionInProgress: state.lock ? { action: state.lock.action, startedAt: state.lock.startedAt } : null })
  }

  async simulate(body = {}) {
    const action = body.action
    if (!['restart-minecraft', 'maintenance'].includes(action)) throw new ActionError('Simulation action is not allowlisted')
    if (action === 'restart-minecraft') {
      const guard = await guardRestart(this.config, body)
      return { simulation: true, allowed: true, action, guard, canaries: this.config.canaries.map(({ name, type }) => ({ name, type })) }
    }
    if (typeof body.enabled !== 'boolean') throw new ActionError('maintenance simulation requires enabled:boolean')
    return { simulation: true, allowed: true, action, targetState: { enabled: body.enabled, reason: sanitizeText(body.reason || '', 500) } }
  }

  async begin(action, idempotencyKey) {
    if (!IDEMPOTENCY_PATTERN.test(idempotencyKey || '')) throw new ActionError('A valid Idempotency-Key is required', 400)
    const now = this.now()
    return this.store.mutate((state) => {
      pruneState(state, now)
      const previous = state.idempotency[idempotencyKey]
      if (previous) {
        if (previous.action !== action) throw new ActionError('Idempotency-Key was used for another action', 409)
        if (previous.status === 'complete' || previous.status === 'failed') return { replay: true, response: previous.response }
        throw new ActionError('This idempotent action is still running', 409)
      }
      if (state.lock) throw new ActionError(`Another action is running: ${state.lock.action}`, 423)
      const operationId = randomUUID()
      state.lock = { operationId, action, startedAt: new Date(now).toISOString(), expiresAt: now + this.config.lockTtlMs }
      state.idempotency[idempotencyKey] = { operationId, action, status: 'running', expiresAt: now + this.config.idempotencyTtlMs }
      return { replay: false, operationId }
    })
  }

  async finish(idempotencyKey, operationId, status, response) {
    const now = this.now()
    await this.store.mutate((state) => {
      const entry = state.idempotency[idempotencyKey]
      if (entry?.operationId === operationId) Object.assign(entry, { status, response: sanitizeValue(response), completedAt: new Date(now).toISOString(), expiresAt: now + this.config.idempotencyTtlMs })
      if (state.lock?.operationId === operationId) state.lock = null
    })
  }

  async runAction(action, idempotencyKey, body, executor) {
    const start = await this.begin(action, idempotencyKey)
    if (start.replay) return { ...start.response, replayed: true }
    try {
      await this.audit({ type: 'action.started', action, operationId: start.operationId, request: body })
      const result = sanitizeValue(await executor(start.operationId))
      const response = { ok: true, action, operationId: start.operationId, result, auditWarning: null }
      try {
        await this.audit({ type: 'action.completed', action, operationId: start.operationId, result })
      } catch (auditError) {
        response.auditWarning = safeError(auditError)
      }
      await this.finish(idempotencyKey, start.operationId, 'complete', response)
      return response
    } catch (error) {
      const response = { ok: false, action, operationId: start.operationId, error: safeError(error), details: sanitizeValue(error.details || error.results) }
      await this.finish(idempotencyKey, start.operationId, 'failed', response)
      await this.audit({ type: 'action.failed', action, operationId: start.operationId, error: response.error, details: response.details }).catch(() => undefined)
      throw Object.assign(new ActionError(response.error.message, error.status || 500, response), { operationResponse: response })
    }
  }

  async changeMaintenance(enabled, reason) {
    if (enabled) {
      const state = await setMaintenance(this.config.maintenanceFile, true, reason)
      const adapter = await this.adapter.setMaintenance?.(true)
      return { state, adapter: adapter || { mode: 'marker-file' } }
    }
    const adapter = await this.adapter.setMaintenance?.(false)
    const state = await setMaintenance(this.config.maintenanceFile, false)
    return { state, adapter: adapter || { mode: 'marker-file' } }
  }

  restartMinecraft(idempotencyKey, body = {}) {
    return this.runAction('restart-minecraft', idempotencyKey, body, async () => {
      const guard = await guardRestart(this.config, body)
      if (this.config.canaries.length === 0 && !this.config.allowRestartWithoutCanaries) {
        throw new ActionError('Restart refused because no post-restart canary is configured', 503)
      }
      const maintenance = await this.changeMaintenance(true, body.reason || 'Minecraft restart')
      const restart = await this.adapter.restartMinecraft()
      try {
        const canaries = await runCanaries(this.config.canaries)
        await this.changeMaintenance(false)
        return { guard, maintenance, restart, canaries, maintenanceCleared: true }
      } catch (error) {
        error.details = { canaries: error.results, maintenanceLeftEnabled: true }
        throw error
      }
    })
  }

  maintenance(idempotencyKey, body = {}) {
    if (typeof body.enabled !== 'boolean') throw new ActionError('enabled:boolean is required')
    return this.runAction('maintenance', idempotencyKey, body, async () => this.changeMaintenance(body.enabled, body.reason))
  }
}

export const internals = { readMaintenance, setMaintenance, fetchPlayerCount, guardRestart, jsonPointer }
