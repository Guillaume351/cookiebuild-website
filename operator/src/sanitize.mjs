const SECRET_KEY = /(authorization|cookie|password|secret|signature|token|webhook|api[-_]?key)/i

export function sanitizeText(value, maxLength = 8_192) {
  return String(value ?? '')
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, '$1[redacted]@')
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [redacted]')
    .replace(/\b(password|secret|token|api[-_]?key|authorization)\s*[=:]\s*[^\s,;]+/gi, '$1=[redacted]')
    .slice(0, maxLength)
}

export function sanitizeValue(value, depth = 0) {
  if (depth > 8) return '[truncated]'
  if (typeof value === 'string') return sanitizeText(value)
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeValue(item, depth + 1))
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 100)
      .map(([key, item]) => [key, SECRET_KEY.test(key) ? '[redacted]' : sanitizeValue(item, depth + 1)]),
  )
}

export function safeError(error) {
  return {
    name: sanitizeText(error?.name || 'Error', 100),
    message: sanitizeText(error?.message || 'Unexpected error', 1_000),
    code: sanitizeText(error?.code || '', 100),
  }
}
