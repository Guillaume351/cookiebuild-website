import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { signRequest } from '../src/auth.mjs'
import { createOperatorServer } from '../src/server.mjs'
import { StateStore } from '../src/state-store.mjs'

test('signed status accepts the exact path including query', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'cookiebuild-operator-server-'))
  const secret = 's'.repeat(32)
  const store = new StateStore(join(directory, 'state.json'))
  const config = { secret, maxBodyBytes: 32_768, authSkewMs: 60_000, nonceTtlMs: 120_000 }
  const service = { status: async () => ({ ok: true }) }
  const server = createOperatorServer({ config, store, service })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => server.close())

  const path = '/v1/status?scope=full%20state'
  const timestamp = String(Date.now())
  const nonce = '12345678-1234-1234-1234-123456789abc'
  const headers = {
    'X-CookieBuild-Timestamp': timestamp,
    'X-CookieBuild-Nonce': nonce,
    'X-CookieBuild-Signature': signRequest(secret, { method: 'GET', path, timestamp, nonce, body: Buffer.alloc(0) }),
  }
  const result = await new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port: server.address().port, path, headers }, (response) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString('utf8') }))
    })
    request.on('error', reject)
  })
  assert.equal(result.status, 200)
  assert.deepEqual(JSON.parse(result.body), { ok: true })
})
