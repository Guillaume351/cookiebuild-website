import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeText, sanitizeValue } from '../src/sanitize.mjs'

test('sanitizer removes credential-bearing values', () => {
  assert.equal(sanitizeValue({ token: 'hello', nested: { password: 'world' } }).token, '[redacted]')
  assert.doesNotMatch(sanitizeText('https://user:pass@example.test/path Authorization: Bearer abc.def'), /user:pass|abc\.def/)
  assert.doesNotMatch(sanitizeText('TOKEN=top-secret password:another-secret'), /top-secret|another-secret/)
})
