import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { loadConfig } from '../src/config.mjs'

test('loads the optional webhook from a mounted secret file', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'cookiebuild-update-config-'))
  context.after(() => rm(directory, { recursive: true, force: true }))
  const file = join(directory, 'webhook')
  await writeFile(file, 'https://discord.com/api/webhooks/example/token\n', { mode: 0o600 })

  const config = loadConfig({
    UPDATE_MONITOR_HMAC_SECRET: 'x'.repeat(32),
    UPDATE_MONITOR_WEBHOOK_FILE: file,
  })

  assert.equal(config.webhookUrl, 'https://discord.com/api/webhooks/example/token')
})

test('refuses ambiguous webhook configuration', () => {
  assert.throws(() => loadConfig({
    UPDATE_MONITOR_HMAC_SECRET: 'x'.repeat(32),
    UPDATE_MONITOR_WEBHOOK_FILE: '/run/secrets/webhook',
    UPDATE_MONITOR_WEBHOOK_URL: 'https://discord.com/api/webhooks/example/token',
  }), /not both/)
})

test('accepts only an absolute runtime version snapshot path', () => {
  const config = loadConfig({
    UPDATE_MONITOR_HMAC_SECRET: 'x'.repeat(32),
    UPDATE_MONITOR_RUNTIME_VERSIONS_FILE: '/runtime/versions/installed-versions.json',
  })
  assert.equal(config.runtimeVersionsFile, '/runtime/versions/installed-versions.json')
  assert.equal(config.runtimeVersionsStaleAfterMs, 900_000)

  assert.throws(() => loadConfig({
    UPDATE_MONITOR_HMAC_SECRET: 'x'.repeat(32),
    UPDATE_MONITOR_RUNTIME_VERSIONS_FILE: './installed-versions.json',
  }), /Expected an absolute path/)
})
