import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { canonicalRequest, signRequest, verifyRequestAuth } from '../src/auth.mjs'
import { StateStore } from '../src/state-store.mjs'

test('monitor uses the shared BFF canonical request contract', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cookiebuild-monitor-auth-'))
  const store = new StateStore(join(directory, 'state.json'))
  const now = 1_784_123_456_789
  const request = { method: 'GET', path: '/v1/report.md?locale=fr', timestamp: String(now), nonce: '12345678-1234-1234-1234-123456789abc', body: Buffer.alloc(0) }
  assert.equal(canonicalRequest(request).split('\n')[1], '/v1/report.md?locale=fr')
  const headers = {
    'x-cookiebuild-timestamp': request.timestamp,
    'x-cookiebuild-nonce': request.nonce,
    'x-cookiebuild-signature': signRequest('m'.repeat(32), request),
  }
  await verifyRequestAuth({ ...request, headers, secret: 'm'.repeat(32), store, now })
  await assert.rejects(() => verifyRequestAuth({ ...request, headers, secret: 'm'.repeat(32), store, now }), /Nonce already used/)
})
