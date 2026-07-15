import { isAbsolute, resolve } from 'node:path'

function integer(value, fallback, min, max) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback
}

function boolean(value, fallback = false) {
  if (value == null) return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function absolutePath(value, fallback) {
  const path = value || fallback
  if (!isAbsolute(path)) throw new Error(`Expected an absolute path: ${path}`)
  return resolve(path)
}

function json(value, fallback) {
  if (!value) return fallback
  return JSON.parse(value)
}

export function loadConfig(env = process.env) {
  const secret = env.OPERATOR_HMAC_SECRET || ''
  if (secret.length < 32) throw new Error('OPERATOR_HMAC_SECRET must contain at least 32 characters')

  const canaries = json(env.OPERATOR_CANARIES_JSON, [])
  if (!Array.isArray(canaries)) throw new Error('OPERATOR_CANARIES_JSON must be an array')

  return {
    host: env.OPERATOR_HOST || '127.0.0.1',
    port: integer(env.OPERATOR_PORT, 9410, 1, 65_535),
    secret,
    stateFile: absolutePath(env.OPERATOR_STATE_FILE, '/state/operator-state.json'),
    auditFile: absolutePath(env.OPERATOR_AUDIT_FILE, '/state/operator-audit.jsonl'),
    maintenanceFile: absolutePath(env.OPERATOR_MAINTENANCE_FILE, '/state/maintenance.json'),
    maxBodyBytes: integer(env.OPERATOR_MAX_BODY_BYTES, 32_768, 1_024, 1_048_576),
    authSkewMs: integer(env.OPERATOR_AUTH_SKEW_MS, 60_000, 5_000, 600_000),
    nonceTtlMs: integer(env.OPERATOR_NONCE_TTL_MS, 120_000, 60_000, 3_600_000),
    lockTtlMs: integer(env.OPERATOR_LOCK_TTL_MS, 600_000, 30_000, 3_600_000),
    idempotencyTtlMs: integer(env.OPERATOR_IDEMPOTENCY_TTL_MS, 86_400_000, 60_000, 604_800_000),
    adapter: env.OPERATOR_ADAPTER || 'docker-swarm',
    dockerBin: absolutePath(env.OPERATOR_DOCKER_BIN, '/usr/bin/docker'),
    serviceName: env.OPERATOR_MINECRAFT_SERVICE || '',
    commandManifestFile: env.OPERATOR_COMMAND_MANIFEST_FILE ? absolutePath(env.OPERATOR_COMMAND_MANIFEST_FILE) : null,
    allowedExecutables: (env.OPERATOR_ALLOWED_EXECUTABLES || '').split(',').filter(Boolean).map((item) => absolutePath(item.trim())),
    monitorStatusUrl: env.OPERATOR_MONITOR_STATUS_URL || '',
    monitorPlayersPointer: env.OPERATOR_MONITOR_PLAYERS_POINTER || '/checks/Java server/details/players',
    monitorTimeoutMs: integer(env.OPERATOR_MONITOR_TIMEOUT_MS, 3_000, 250, 30_000),
    allowRestartWithoutMonitor: boolean(env.OPERATOR_ALLOW_RESTART_WITHOUT_MONITOR),
    allowForceWithPlayers: boolean(env.OPERATOR_ALLOW_FORCE_WITH_PLAYERS),
    allowRestartWithoutCanaries: boolean(env.OPERATOR_ALLOW_RESTART_WITHOUT_CANARIES),
    canaries,
  }
}
