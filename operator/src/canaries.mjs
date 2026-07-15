import net from 'node:net'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function jsonPointer(value, pointer) {
  if (!pointer || pointer === '/') return value
  return pointer.split('/').slice(1).reduce((item, part) => item?.[part.replace(/~1/g, '/').replace(/~0/g, '~')], value)
}

async function httpCanary(canary) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), canary.timeoutMs || 3_000)
  try {
    const response = await fetch(canary.url, { signal: controller.signal, redirect: 'error' })
    if (response.status !== (canary.expectedStatus || 200)) throw new Error(`Unexpected HTTP status ${response.status}`)
    if (canary.jsonPointer) {
      const actual = jsonPointer(await response.json(), canary.jsonPointer)
      if (JSON.stringify(actual) !== JSON.stringify(canary.expectedValue)) throw new Error('Unexpected JSON canary value')
    }
    return { status: response.status }
  } finally {
    clearTimeout(timeout)
  }
}

function tcpCanary(canary) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: canary.host, port: canary.port })
    socket.setTimeout(canary.timeoutMs || 3_000)
    socket.once('connect', () => {
      socket.destroy()
      resolve({ connected: true })
    })
    socket.once('timeout', () => socket.destroy(new Error('TCP canary timed out')))
    socket.once('error', reject)
  })
}

function validateCanary(canary) {
  if (!canary || !['http', 'tcp'].includes(canary.type) || !/^[A-Za-z0-9_.-]{1,64}$/.test(canary.name || '')) {
    throw new Error('Invalid canary definition')
  }
  if (canary.type === 'http') {
    const url = new URL(canary.url)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid HTTP canary URL')
  } else if (!canary.host || !Number.isInteger(canary.port) || canary.port < 1 || canary.port > 65_535) {
    throw new Error('Invalid TCP canary target')
  }
}

export async function runCanaries(canaries) {
  const results = []
  for (const canary of canaries) {
    validateCanary(canary)
    const attempts = Math.min(Math.max(Number(canary.attempts) || 5, 1), 20)
    let lastError
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const details = canary.type === 'http' ? await httpCanary(canary) : await tcpCanary(canary)
        results.push({ name: canary.name, ok: true, attempt, details })
        lastError = null
        break
      } catch (error) {
        lastError = error
        if (attempt < attempts) await sleep(Math.min(Number(canary.delayMs) || 2_000, 30_000))
      }
    }
    if (lastError) {
      results.push({ name: canary.name, ok: false, error: lastError.message })
      throw Object.assign(new Error(`Canary failed: ${canary.name}`), { results })
    }
  }
  return results
}

export const internals = { jsonPointer, validateCanary }
