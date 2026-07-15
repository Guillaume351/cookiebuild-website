import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fetchCachedJson } from '../src/http-cache.mjs'
import { StateStore } from '../src/state-store.mjs'

test('upstream ETag is persisted and revalidated', async (t) => {
  let requests = 0
  const server = http.createServer((request, response) => {
    requests += 1
    if (request.headers['if-none-match'] === '"release-1"') {
      response.writeHead(304)
      return response.end()
    }
    response.setHeader('etag', '"release-1"')
    response.setHeader('content-type', 'application/json')
    response.end('{"version":"1.0.0"}')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => server.close())
  const directory = await mkdtemp(join(tmpdir(), 'cookiebuild-monitor-cache-'))
  const store = new StateStore(join(directory, 'state.json'))
  const url = `http://127.0.0.1:${server.address().port}/release`
  const first = await fetchCachedJson({ id: 'test', url, store })
  const second = await fetchCachedJson({ id: 'test', url, store })
  assert.equal(first.cache, 'miss')
  assert.equal(second.cache, 'revalidated')
  assert.equal(second.payload.version, '1.0.0')
  assert.equal(requests, 2)
})
