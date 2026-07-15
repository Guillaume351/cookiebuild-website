import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { UpdateMonitor } from '../src/monitor.mjs'
import { compareVersions } from '../src/report.mjs'
import { StateStore } from '../src/state-store.mjs'

test('natural comparison handles release and build versions', () => {
  assert.equal(compareVersions('1.21.4-120', '1.21.4-121'), -1)
  assert.equal(compareVersions('v2.5.1', '2.5.1'), 0)
  assert.equal(compareVersions('5.10.0', '5.9.1'), 1)
})

test('check persists report/prompt and replays an idempotency key', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cookiebuild-monitor-run-'))
  let collections = 0
  const config = {
    installedJson: JSON.stringify({ paper: '1.21.4-120' }),
    installedFile: null,
    reportFile: join(directory, 'report.md'),
    promptFile: join(directory, 'prompt.txt'),
    webhookUrl: null,
    staleAfterMs: 60_000,
  }
  const store = new StateStore(join(directory, 'state.json'))
  const collect = async () => {
    collections += 1
    return [{ id: 'paper', name: 'Paper', ok: true, target: '1.21.4-121', sourceUrl: 'https://example.test/api', changelogUrl: 'https://example.test/changelog', downloadUrl: 'https://example.test/download', summary: 'Stable fixes' }]
  }
  const monitor = new UpdateMonitor({ config, store, collect, now: () => 1_784_123_456_789 })
  const first = await monitor.run({ idempotencyKey: 'manual-check-001', trigger: 'test' })
  const second = await monitor.run({ idempotencyKey: 'manual-check-001', trigger: 'test' })
  assert.equal(first.results[0].updateAvailable, true)
  assert.equal(second.replayed, true)
  assert.equal(collections, 1)
  assert.match(await readFile(config.reportFile, 'utf8'), /Paper.*1\.21\.4-120.*1\.21\.4-121/)
  assert.match(await readFile(config.promptFile, 'utf8'), /N’exécute aucune commande/)
  const metrics = await monitor.metrics()
  assert.match(metrics, /cookiebuild_update_available\{component="paper"\} 1/)
  assert.doesNotMatch(metrics, /cookiebuilder/)
})
