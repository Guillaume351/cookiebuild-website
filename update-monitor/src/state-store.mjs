import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

function emptyState() {
  return { version: 1, nonces: {}, sources: {}, checkIdempotency: {}, checkLock: null, runFailuresTotal: 0, lastRun: null, lastSuccessfulRunAt: null, lastAlertHash: null }
}

export class StateStore {
  constructor(file) {
    this.file = file
    this.queue = Promise.resolve()
  }

  async read() {
    try {
      return { ...emptyState(), ...JSON.parse(await readFile(this.file, 'utf8')) }
    } catch (error) {
      if (error.code === 'ENOENT') return emptyState()
      throw error
    }
  }

  async mutate(mutator) {
    const operation = this.queue.then(async () => {
      const state = await this.read()
      const result = await mutator(state)
      await mkdir(dirname(this.file), { recursive: true })
      const temp = `${this.file}.${process.pid}.${Date.now()}.tmp`
      await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
      await rename(temp, this.file)
      return result
    })
    this.queue = operation.catch(() => undefined)
    return operation
  }
}

export function pruneState(state, now = Date.now()) {
  for (const [nonce, expiresAt] of Object.entries(state.nonces || {})) if (expiresAt <= now) delete state.nonces[nonce]
  for (const [key, item] of Object.entries(state.checkIdempotency || {})) if (!item || item.expiresAt <= now) delete state.checkIdempotency[key]
  if (state.checkLock?.expiresAt <= now) state.checkLock = null
}
