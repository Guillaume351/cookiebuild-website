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

function memoryStore() {
  const state = { sources: {} }
  return { read: async () => state, mutate: async (fn) => fn(state) }
}

test('body deadline remains active after upstream headers arrive', { timeout: 4_000 }, async (t) => {
  let requests = 0
  const server = http.createServer((_request, response) => {
    requests += 1
    response.writeHead(200, { 'content-type': 'application/json' })
    response.flushHeaders()
    response.write('{"version":"')
    const timer = setInterval(() => response.write('x'), 10)
    response.once('close', () => clearInterval(timer))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => { server.closeAllConnections(); server.close() })
  await assert.rejects(fetchCachedJson({ id: 'slow', url: `http://127.0.0.1:${server.address().port}/release`, timeoutMs: 60, store: memoryStore() }), /abort/i)
  assert.equal(requests, 3)
})

test('oversized streaming bodies are cancelled before upstream finishes', { timeout: 4_000 }, async (t) => {
  let requests = 0
  const server = http.createServer((_request, response) => {
    requests += 1
    response.writeHead(200, { 'content-type': 'application/json' })
    const chunk = Buffer.alloc(256 * 1024, 'x')
    const timer = setInterval(() => response.write(chunk), 5)
    response.once('close', () => clearInterval(timer))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => { server.closeAllConnections(); server.close() })
  await assert.rejects(fetchCachedJson({ id: 'large', url: `http://127.0.0.1:${server.address().port}/release`, timeoutMs: 1_000, store: memoryStore() }), /response is too large/)
  assert.equal(requests, 3)
})
