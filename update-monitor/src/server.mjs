import http from 'node:http'
import { pathToFileURL } from 'node:url'
import { loadConfig } from './config.mjs'
import { StateStore } from './state-store.mjs'
import { AuthError, verifyRequestAuth } from './auth.mjs'
import { MonitorError, UpdateMonitor } from './monitor.mjs'
import { log, safeError, sanitizeValue } from './sanitize.mjs'

function send(response, status, value, contentType = 'application/json; charset=utf-8') {
  const body = contentType.startsWith('application/json') ? JSON.stringify(sanitizeValue(value)) : String(value)
  response.writeHead(status, { 'content-type': contentType, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
  response.end(body)
}

async function readBody(request, maxBytes) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maxBytes) throw new MonitorError('Request body too large', 413)
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export function createUpdateMonitorServer({ config, store, monitor }) {
  return http.createServer(async (request, response) => {
    try {
      if (!request.url?.startsWith('/')) throw new MonitorError('Only origin-form request targets are accepted', 400)
      const path = request.url
      const url = new URL(path, 'http://update-monitor.invalid')
      if (request.method === 'GET' && url.pathname === '/healthz') {
        const health = await monitor.health()
        return send(response, health.ok ? 200 : 503, health)
      }
      if (request.method === 'GET' && url.pathname === '/metrics') return send(response, 200, await monitor.metrics(), 'text/plain; version=0.0.4; charset=utf-8')

      const body = await readBody(request, config.maxBodyBytes)
      await verifyRequestAuth({ headers: request.headers, method: request.method, path, body, secret: config.secret, store, maxSkewMs: config.authSkewMs, nonceTtlMs: config.nonceTtlMs })

      if (request.method === 'GET' && url.pathname === '/v1/status') return send(response, 200, await monitor.status())
      if (request.method === 'GET' && url.pathname === '/v1/report.md') return send(response, 200, await monitor.report(), 'text/markdown; charset=utf-8')
      if (request.method === 'GET' && url.pathname === '/v1/ai-prompt.txt') return send(response, 200, await monitor.prompt(), 'text/plain; charset=utf-8')
      if (request.method === 'POST' && url.pathname === '/v1/check') {
        return send(response, 200, await monitor.run({ idempotencyKey: request.headers['idempotency-key'], trigger: 'bff' }))
      }
      return send(response, 404, { error: 'Not found' })
    } catch (error) {
      const status = error instanceof AuthError || error instanceof MonitorError ? error.status : error.code === 'ENOENT' ? 404 : 500
      return send(response, status, { error: safeError(error) })
    }
  })
}

export async function main() {
  const config = loadConfig()
  const store = new StateStore(config.stateFile)
  const monitor = new UpdateMonitor({ config, store })
  const server = createUpdateMonitorServer({ config, store, monitor })
  server.listen(config.port, config.host, () => log({ level: 'info', event: 'update_monitor.started', host: config.host, port: config.port }))

  const runScheduled = () => {
    const key = `timer:${Math.floor(Date.now() / config.intervalMs)}`
    monitor.run({ idempotencyKey: key, trigger: 'timer' })
      .then((run) => log({ level: 'info', event: 'update_monitor.check_completed', successfulSources: run.successfulSources, totalSources: run.totalSources }))
      .catch((error) => log({ level: 'error', event: 'update_monitor.check_failed', error: safeError(error) }))
  }
  runScheduled()
  setInterval(runScheduled, config.intervalMs).unref()
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    log({ level: 'error', event: 'update_monitor.start_failed', error: safeError(error) })
    process.exitCode = 1
  })
}

export const internals = { readBody }
