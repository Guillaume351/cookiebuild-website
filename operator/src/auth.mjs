import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { pruneState } from './state-store.mjs'

const NONCE_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/
const SIGNATURE_PATTERN = /^[a-fA-F0-9]{64}$/

export function bodySha256(body = Buffer.alloc(0)) {
  return createHash('sha256').update(body).digest('hex')
}

export function canonicalRequest({ method, path, timestamp, nonce, body }) {
  return `${method.toUpperCase()}\n${path}\n${timestamp}\n${nonce}\n${bodySha256(body)}`
}

export function signRequest(secret, request) {
  return createHmac('sha256', secret).update(canonicalRequest(request)).digest('hex')
}

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

export async function verifyRequestAuth({ headers, method, path, body, secret, store, now = Date.now(), maxSkewMs = 60_000, nonceTtlMs = 120_000 }) {
  const timestamp = headers['x-cookiebuild-timestamp']
  const nonce = headers['x-cookiebuild-nonce']
  const signature = headers['x-cookiebuild-signature']

  if (!/^\d{13}$/.test(timestamp || '')) throw new AuthError('Invalid timestamp')
  if (!NONCE_PATTERN.test(nonce || '')) throw new AuthError('Invalid nonce')
  if (!SIGNATURE_PATTERN.test(signature || '')) throw new AuthError('Invalid signature')
  if (Math.abs(now - Number(timestamp)) > maxSkewMs) throw new AuthError('Expired timestamp')

  const expected = Buffer.from(signRequest(secret, { method, path, timestamp, nonce, body }), 'hex')
  const supplied = Buffer.from(signature, 'hex')
  if (!timingSafeEqual(expected, supplied)) throw new AuthError('Invalid signature')

  await store.mutate((state) => {
    pruneState(state, now)
    if (state.nonces[nonce]) throw new AuthError('Nonce already used', 409)
    state.nonces[nonce] = now + nonceTtlMs
  })
}
