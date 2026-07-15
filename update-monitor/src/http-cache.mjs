const MAX_RESPONSE_BYTES = 2 * 1024 * 1024

async function fetchOnce(url, { headers, timeoutMs }) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { headers, signal: controller.signal, redirect: 'follow' })
    const requested = new URL(url)
    const resolved = new URL(response.url)
    if (resolved.protocol !== requested.protocol || resolved.hostname !== requested.hostname) throw new Error('Upstream redirected outside its official host')
    return response
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchCachedJson({ id, url, store, headers = {}, timeoutMs = 15_000 }) {
  const state = await store.read()
  const cached = state.sources[id]?.cache
  const requestHeaders = { accept: 'application/json', ...headers }
  if (cached?.etag) requestHeaders['if-none-match'] = cached.etag
  if (cached?.lastModified) requestHeaders['if-modified-since'] = cached.lastModified

  let response
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetchOnce(url, { headers: requestHeaders, timeoutMs })
      if (response.status === 304 && cached?.payload) return { payload: cached.payload, cache: 'revalidated' }
      if (!response.ok) throw new Error(`Upstream ${id} returned HTTP ${response.status}`)
      const text = await response.text()
      if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw new Error(`Upstream ${id} response is too large`)
      const payload = JSON.parse(text)
      await store.mutate((next) => {
        next.sources[id] ||= {}
        next.sources[id].cache = {
          etag: response.headers.get('etag'),
          lastModified: response.headers.get('last-modified'),
          fetchedAt: new Date().toISOString(),
          url,
          payload,
        }
      })
      return { payload, cache: 'miss' }
    } catch (error) {
      lastError = error
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 250))
    }
  }
  if (cached?.payload) return { payload: cached.payload, cache: 'stale', warning: lastError.message }
  throw lastError
}
