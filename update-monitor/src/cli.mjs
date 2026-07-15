import { loadConfig } from './config.mjs'
import { StateStore } from './state-store.mjs'
import { UpdateMonitor } from './monitor.mjs'
import { log, safeError } from './sanitize.mjs'

try {
  const config = loadConfig()
  const monitor = new UpdateMonitor({ config, store: new StateStore(config.stateFile) })
  const run = await monitor.run({ idempotencyKey: `cli:${Date.now()}`, trigger: 'cli' })
  log({ level: 'info', event: 'update_monitor.check_completed', successfulSources: run.successfulSources, totalSources: run.totalSources })
} catch (error) {
  log({ level: 'error', event: 'update_monitor.check_failed', error: safeError(error) })
  process.exitCode = 1
}
