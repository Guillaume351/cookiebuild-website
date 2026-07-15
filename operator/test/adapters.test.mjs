import assert from 'node:assert/strict'
import test from 'node:test'
import { internals } from '../src/adapters.mjs'

const executable = '/usr/bin/printf'

test('command manifest uses fixed argv without a shell', async () => {
  const literal = '$(touch /tmp/cookiebuild-operator-must-not-exist)'
  const adapter = new internals.CommandManifestAdapter({
    status: { executable, args: ['%s', 'ok'] },
    'restart-minecraft': { executable, args: ['%s', literal] },
  }, [executable])
  const result = await adapter.restartMinecraft()
  assert.equal(result.stdout, literal)
})

test('maintenance manifest commands must be configured as a pair', () => {
  assert.throws(() => new internals.CommandManifestAdapter({
    status: { executable, args: ['ok'] },
    'restart-minecraft': { executable, args: ['ok'] },
    'maintenance-on': { executable, args: ['on'] },
  }, [executable]), /maintenance-off/)
})
