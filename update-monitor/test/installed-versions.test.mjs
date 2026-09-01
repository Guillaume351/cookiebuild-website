import assert from 'node:assert/strict'
import test from 'node:test'
import { loadInstalledVersions } from '../src/installed-versions.mjs'

const now = Date.parse('2026-09-01T08:00:00.000Z')

function snapshot(overrides = {}) {
  return JSON.stringify({
    schemaVersion: 1,
    generatedAt: '2026-09-01T07:55:00.000Z',
    versions: {
      paper: '26.2-112',
      geyser: '2.11.2+1230',
      floodgate: '2.2.5+140',
      viaversion: '5.11.0',
      viabackwards: '5.11.0',
      protocollib: '5.4.0-SNAPSHOT-748',
      oldcombatmechanics: '2.5.1',
      ...overrides,
    },
  })
}

function config() {
  return {
    installedJson: JSON.stringify({ paper: '26.2-100', geyser: '2.11.1+1224' }),
    installedFile: null,
    runtimeVersionsFile: '/runtime/versions/installed-versions.json',
    runtimeVersionsStaleAfterMs: 900_000,
  }
}

test('fresh runtime snapshot overrides every stale declaration without truncating prereleases', async () => {
  const result = await loadInstalledVersions(config(), {
    now: () => now,
    readTextFile: async (file) => file.startsWith('/runtime/') ? snapshot() : null,
  })

  assert.equal(result.versions.paper, '26.2-112')
  assert.equal(result.versions.geyser, '2.11.2+1230')
  assert.equal(result.versions.protocollib, '5.4.0-SNAPSHOT-748')
  assert.deepEqual(result.evidence.geyser, {
    source: 'runtime-snapshot',
    artifact: 'installed-versions.json',
    generatedAt: '2026-09-01T07:55:00.000Z',
    error: null,
  })
})

test('stale runtime snapshot fails closed instead of reusing declarations', async () => {
  const result = await loadInstalledVersions(config(), {
    now: () => now,
    readTextFile: async () => JSON.stringify({
      schemaVersion: 1,
      generatedAt: '2026-09-01T06:00:00.000Z',
      versions: { geyser: '2.11.1+1224' },
    }),
  })

  assert.equal(result.versions.paper, undefined)
  assert.equal(result.versions.geyser, undefined)
  assert.match(result.evidence.geyser.error, /snapshot is stale/)
})

test('a missing component in a fresh snapshot is unknown, never a declared fallback', async () => {
  const value = JSON.parse(snapshot())
  delete value.versions.geyser
  const result = await loadInstalledVersions(config(), {
    now: () => now,
    readTextFile: async () => JSON.stringify(value),
  })

  assert.equal(result.versions.geyser, undefined)
  assert.match(result.evidence.geyser.error, /missing for geyser/)
  assert.equal(result.versions.paper, '26.2-112')
})

test('declared compatibility mode remains available when no runtime snapshot is configured', async () => {
  const result = await loadInstalledVersions({
    installedJson: JSON.stringify({ paper: '26.2-112', geyser: '2.11.1+1224' }),
    installedFile: null,
    runtimeVersionsFile: null,
  })

  assert.equal(result.versions.geyser, '2.11.1+1224')
  assert.equal(result.evidence.geyser.source, 'declared-config')
})
