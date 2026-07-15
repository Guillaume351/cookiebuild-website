import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { canonicalRequest, signRequest, verifyRequestAuth } from '../src/auth.mjs'
import { StateStore } from '../src/state-store.mjs'

test('canonical signature includes the exact path and raw body hash', () => {
  const body = Buffer.from('{"enabled":true}')
  const request = { method: 'post', path: '/v1/actions/maintenance?source=bff', timestamp: '1784123456789', nonce: '12345678-1234-1234-1234-123456789abc', body }
  assert.equal(
    canonicalRequest(request),
    `POST\n/v1/actions/maintenance?source=bff\n1784123456789\n12345678-1234-1234-1234-123456789abc\n${'26b3426b2593763c96d0890b4a77a0bbf66d13fc512b0c6b138a23c290f30a2a'}`,
  )
  assert.match(signRequest('a'.repeat(32), request), /^[a-f0-9]{64}$/)
})

test('verification persists nonces and rejects replay', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cookiebuild-operator-auth-'))
  const store = new StateStore(join(directory, 'state.json'))
  const now = 1_784_123_456_789
  const request = { method: 'GET', path: '/v1/status?full=1', timestamp: String(now), nonce: 'nonce-for-a-single-request', body: Buffer.alloc(0) }
  const headers = {
    'x-cookiebuild-timestamp': request.timestamp,
    'x-cookiebuild-nonce': request.nonce,
    'x-cookiebuild-signature': signRequest('b'.repeat(32), request),
  }
  await verifyRequestAuth({ headers, ...request, secret: 'b'.repeat(32), store, now })
  await assert.rejects(() => verifyRequestAuth({ headers, ...request, secret: 'b'.repeat(32), store, now }), /Nonce already used/)
})
