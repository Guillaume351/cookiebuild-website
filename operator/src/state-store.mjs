import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const EMPTY_STATE = Object.freeze({ version: 1, nonces: {}, idempotency: {}, lock: null })

function cloneEmptyState() {
  return structuredClone(EMPTY_STATE)
}

export class StateStore {
  constructor(file) {
    this.file = file
    this.queue = Promise.resolve()
  }

  async read() {
    try {
      const state = JSON.parse(await readFile(this.file, 'utf8'))
      return { ...cloneEmptyState(), ...state }
    } catch (error) {
      if (error.code === 'ENOENT') return cloneEmptyState()
      throw error
    }
  }

  async mutate(mutator) {
    const operation = this.queue.then(async () => {
      const state = await this.read()
      const result = await mutator(state)
      await this.write(state)
      return result
    })
    this.queue = operation.catch(() => undefined)
    return operation
  }

  async write(state) {
    await mkdir(dirname(this.file), { recursive: true })
    const temp = `${this.file}.${process.pid}.${Date.now()}.tmp`
    await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
    await rename(temp, this.file)
  }
}

export function pruneState(state, now = Date.now()) {
  for (const [nonce, expiresAt] of Object.entries(state.nonces || {})) {
    if (expiresAt <= now) delete state.nonces[nonce]
  }
  for (const [key, item] of Object.entries(state.idempotency || {})) {
    if (!item || item.expiresAt <= now) delete state.idempotency[key]
  }
  if (state.lock?.expiresAt <= now) state.lock = null
}
