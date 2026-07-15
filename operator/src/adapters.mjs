import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { promisify } from 'node:util'
import { sanitizeText } from './sanitize.mjs'

const execFileAsync = promisify(execFile)
const SAFE_SERVICE = /^[A-Za-z0-9_.-]{1,128}$/
const REQUIRED_ACTIONS = new Set(['status', 'restart-minecraft'])
const OPTIONAL_ACTIONS = new Set(['maintenance-on', 'maintenance-off'])

async function execute(executable, args, timeoutMs = 120_000) {
  const { stdout, stderr } = await execFileAsync(executable, args, {
    shell: false,
    timeout: timeoutMs,
    maxBuffer: 256 * 1024,
    windowsHide: true,
    env: { PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' },
  })
  return { stdout: sanitizeText(stdout), stderr: sanitizeText(stderr) }
}

class DockerSwarmAdapter {
  constructor(config) {
    if (!SAFE_SERVICE.test(config.serviceName)) throw new Error('OPERATOR_MINECRAFT_SERVICE must be a safe Docker service name')
    this.bin = config.dockerBin
    this.service = config.serviceName
  }

  async status() {
    const safeFormat = '{"name":{{json .Spec.Name}},"version":{{json .Version.Index}},"updatedAt":{{json .UpdatedAt}},"updateStatus":{{json .UpdateStatus}},"serviceStatus":{{json .ServiceStatus}}}'
    const result = await execute(this.bin, ['service', 'inspect', this.service, '--format', safeFormat], 15_000)
    let service
    try {
      service = JSON.parse(result.stdout)
    } catch {
      service = { raw: result.stdout }
    }
    return { adapter: 'docker-swarm', service: this.service, serviceState: service, stderr: result.stderr }
  }

  async restartMinecraft() {
    const result = await execute(this.bin, ['service', 'update', '--force', this.service], 180_000)
    return { adapter: 'docker-swarm', service: this.service, ...result }
  }

  async setMaintenance() {
    return { adapter: 'docker-swarm', mode: 'marker-file' }
  }
}

class CommandManifestAdapter {
  constructor(manifest, allowedExecutables) {
    this.manifest = manifest
    this.allowed = new Set(allowedExecutables)
    for (const action of REQUIRED_ACTIONS) this.validateAction(action)
    const hasMaintenance = [...OPTIONAL_ACTIONS].some((action) => this.manifest[action])
    if (hasMaintenance) for (const action of OPTIONAL_ACTIONS) this.validateAction(action)
  }

  validateAction(action) {
    const command = this.manifest[action]
    if (!command || !isAbsolute(command.executable) || !this.allowed.has(command.executable)) {
      throw new Error(`Manifest action ${action} must use an allowlisted absolute executable`)
    }
    if (!Array.isArray(command.args) || command.args.some((arg) => typeof arg !== 'string' || arg.length > 1_024)) {
      throw new Error(`Manifest action ${action} has invalid fixed arguments`)
    }
  }

  run(action) {
    const command = this.manifest[action]
    return execute(command.executable, command.args, Math.min(Number(command.timeoutMs) || 120_000, 300_000))
  }

  async status() {
    return { adapter: 'command-manifest', ...(await this.run('status')) }
  }

  async restartMinecraft() {
    return { adapter: 'command-manifest', ...(await this.run('restart-minecraft')) }
  }

  async setMaintenance(enabled) {
    const action = enabled ? 'maintenance-on' : 'maintenance-off'
    if (!this.manifest[action]) return { adapter: 'command-manifest', mode: 'marker-file' }
    return { adapter: 'command-manifest', action, ...(await this.run(action)) }
  }
}

export async function createAdapter(config) {
  if (config.adapter === 'docker-swarm') return new DockerSwarmAdapter(config)
  if (config.adapter === 'command-manifest') {
    if (!config.commandManifestFile) throw new Error('OPERATOR_COMMAND_MANIFEST_FILE is required')
    const manifest = JSON.parse(await readFile(config.commandManifestFile, 'utf8'))
    return new CommandManifestAdapter(manifest, config.allowedExecutables)
  }
  throw new Error(`Unsupported OPERATOR_ADAPTER: ${config.adapter}`)
}

export const internals = { execute, DockerSwarmAdapter, CommandManifestAdapter }
