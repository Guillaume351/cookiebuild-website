import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { StateStore } from '../src/state-store.mjs'
import { OperatorService } from '../src/service.mjs'

async function playerServer(players) {
  const server = http.createServer((_request, response) => {
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ players }))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { server, url: `http://127.0.0.1:${server.address().port}/status` }
}

async function fixture(players = 0) {
  const directory = await mkdtemp(join(tmpdir(), 'cookiebuild-operator-service-'))
  const monitor = await playerServer(players)
  let restarts = 0
  const config = {
    stateFile: join(directory, 'state.json'),
    auditFile: join(directory, 'audit.jsonl'),
    maintenanceFile: join(directory, 'maintenance.json'),
    lockTtlMs: 60_000,
    idempotencyTtlMs: 60_000,
    monitorStatusUrl: monitor.url,
    monitorPlayersPointer: '/players',
    monitorTimeoutMs: 1_000,
    allowRestartWithoutMonitor: false,
    allowForceWithPlayers: false,
    allowRestartWithoutCanaries: true,
    canaries: [],
  }
  const adapter = {
    status: async () => ({ running: true }),
    restartMinecraft: async () => ({ restarted: ++restarts }),
  }
  return { directory, monitor, service: new OperatorService({ config, store: new StateStore(config.stateFile), adapter }), restarts: () => restarts }
}

test('restart is refused while players are online', async (t) => {
  const context = await fixture(2)
  t.after(() => context.monitor.server.close())
  await assert.rejects(() => context.service.restartMinecraft('restart-key-0001', {}), /Restart refused while 2 player/)
  assert.equal(context.restarts(), 0)
})

test('completed mutation is idempotent and maintenance is cleared', async (t) => {
  const context = await fixture(0)
  t.after(() => context.monitor.server.close())
  const first = await context.service.restartMinecraft('restart-key-0002', { reason: 'Routine restart' })
  const second = await context.service.restartMinecraft('restart-key-0002', { reason: 'Routine restart' })
  assert.equal(first.ok, true)
  assert.equal(second.replayed, true)
  assert.equal(context.restarts(), 1)
  await assert.rejects(() => readFile(join(context.directory, 'maintenance.json')), { code: 'ENOENT' })
})
