import http from 'node:http'
import { pathToFileURL } from 'node:url'
import { loadConfig } from './config.mjs'
import { StateStore } from './state-store.mjs'
import { createAdapter } from './adapters.mjs'
import { AuthError, verifyRequestAuth } from './auth.mjs'
import { ActionError, OperatorService } from './service.mjs'
import { safeError, sanitizeValue } from './sanitize.mjs'

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
    if (size > maxBytes) throw new ActionError('Request body too large', 413)
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

function parseJson(body) {
  if (body.length === 0) return {}
  try {
    return JSON.parse(body.toString('utf8'))
  } catch {
    throw new ActionError('Invalid JSON body')
  }
}

export function createOperatorServer({ config, store, service }) {
  return http.createServer(async (request, response) => {
    try {
      if (!request.url?.startsWith('/')) throw new ActionError('Only origin-form request targets are accepted', 400)
      const path = request.url
      const url = new URL(path, 'http://operator.invalid')
      if (request.method === 'GET' && url.pathname === '/healthz') return send(response, 200, { ok: true })

      const bodyBuffer = await readBody(request, config.maxBodyBytes)
      await verifyRequestAuth({ headers: request.headers, method: request.method, path, body: bodyBuffer, secret: config.secret, store, maxSkewMs: config.authSkewMs, nonceTtlMs: config.nonceTtlMs })

      if (request.method === 'GET' && url.pathname === '/v1/status') return send(response, 200, await service.status())
      if (request.method !== 'POST') return send(response, 404, { error: 'Not found' })

      const body = parseJson(bodyBuffer)
      if (url.pathname === '/v1/actions/simulate') return send(response, 200, await service.simulate(body))
      if (url.pathname === '/v1/actions/restart-minecraft') return send(response, 200, await service.restartMinecraft(request.headers['idempotency-key'], body))
      if (url.pathname === '/v1/actions/maintenance') return send(response, 200, await service.maintenance(request.headers['idempotency-key'], body))
      return send(response, 404, { error: 'Not found' })
    } catch (error) {
      const status = error instanceof AuthError || error instanceof ActionError ? error.status : 500
      send(response, status, error.operationResponse || { error: safeError(error), details: error.details })
    }
  })
}

export async function main() {
  const config = loadConfig()
  const store = new StateStore(config.stateFile)
  const adapter = await createAdapter(config)
  const service = new OperatorService({ config, store, adapter })
  const server = createOperatorServer({ config, store, service })
  server.listen(config.port, config.host, () => process.stdout.write(`${JSON.stringify({ level: 'info', event: 'operator.started', host: config.host, port: config.port })}\n`))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ level: 'error', event: 'operator.start_failed', error: safeError(error) })}\n`)
    process.exitCode = 1
  })
}

export const internals = { readBody, parseJson }
