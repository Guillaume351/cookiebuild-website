import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

export const RUNTIME_VERSION_IDS = [
  'paper',
  'geyser',
  'floodgate',
  'viaversion',
  'viabackwards',
  'protocollib',
  'oldcombatmechanics',
]

async function loadDeclared(config, readTextFile) {
  let value = config.installedJson
  if (config.installedFile) value = await readTextFile(config.installedFile, 'utf8')
  if (!value) return {}
  const installed = JSON.parse(value)
  if (!installed || Array.isArray(installed) || typeof installed !== 'object') throw new Error('Installed versions must be a JSON object')
  return Object.fromEntries(Object.entries(installed).filter(([, version]) => typeof version === 'string' && version.length <= 128))
}

function runtimeFailure(message, snapshot = null) {
  return { source: 'runtime-snapshot', artifact: snapshot, generatedAt: null, error: message }
}

function parseRuntimeSnapshot(raw, { now, staleAfterMs }) {
  if (String(raw).length > 65_536) throw new Error('Runtime version snapshot is too large')
  const snapshot = JSON.parse(raw)
  if (!snapshot || Array.isArray(snapshot) || typeof snapshot !== 'object' || snapshot.schemaVersion !== 1) {
    throw new Error('Runtime version snapshot schema is invalid')
  }
  const generatedAt = Date.parse(snapshot.generatedAt || '')
  if (!Number.isFinite(generatedAt)) throw new Error('Runtime version snapshot timestamp is invalid')
  const ageMs = now - generatedAt
  if (ageMs < -60_000) throw new Error('Runtime version snapshot timestamp is in the future')
  if (ageMs > staleAfterMs) throw new Error('Runtime version snapshot is stale')
  if (!snapshot.versions || Array.isArray(snapshot.versions) || typeof snapshot.versions !== 'object') {
    throw new Error('Runtime version snapshot versions are invalid')
  }
  const versions = Object.fromEntries(Object.entries(snapshot.versions)
    .filter(([id, version]) => RUNTIME_VERSION_IDS.includes(id)
      && typeof version === 'string'
      && version.length > 0
      && version.length <= 128
      && !/[\r\n\t]/.test(version)))
  return { generatedAt: snapshot.generatedAt, versions }
}

export async function loadInstalledVersions(config, dependencies = {}) {
  const readTextFile = dependencies.readTextFile || readFile
  const now = dependencies.now?.() ?? Date.now()
  const versions = await loadDeclared(config, readTextFile)
  const evidence = Object.fromEntries(Object.keys(versions).map((id) => [id, {
    source: 'declared-config', artifact: null, generatedAt: null, error: null,
  }]))

  if (!config.runtimeVersionsFile) return { versions, evidence }

  for (const id of RUNTIME_VERSION_IDS) delete versions[id]
  const snapshotName = basename(config.runtimeVersionsFile)
  let runtime
  try {
    runtime = parseRuntimeSnapshot(await readTextFile(config.runtimeVersionsFile, 'utf8'), {
      now,
      staleAfterMs: config.runtimeVersionsStaleAfterMs ?? 900_000,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Runtime version snapshot is unavailable'
    for (const id of RUNTIME_VERSION_IDS) evidence[id] = runtimeFailure(message, snapshotName)
    return { versions, evidence }
  }

  for (const id of RUNTIME_VERSION_IDS) {
    const version = runtime.versions[id]
    if (!version) {
      evidence[id] = runtimeFailure(`Runtime version is missing for ${id}`, snapshotName)
      continue
    }
    versions[id] = version
    evidence[id] = {
      source: 'runtime-snapshot',
      artifact: snapshotName,
      generatedAt: runtime.generatedAt,
      error: null,
    }
  }
  return { versions, evidence }
}

export const internals = { loadDeclared, parseRuntimeSnapshot, runtimeFailure }
