import { fetchCachedJson } from './http-cache.mjs'
import { safeError, sanitizeText } from './sanitize.mjs'

const PAPER_PROJECT = 'https://fill.papermc.io/v3/projects/paper'
const GEYSER_API = 'https://download.geysermc.org/v2/projects'
const GITHUB_API = 'https://api.github.com/repos'

function headers(config, github = false) {
  const result = { 'user-agent': config.userAgent }
  if (github) {
    result.accept = 'application/vnd.github+json'
    result['x-github-api-version'] = '2022-11-28'
    if (config.githubToken) result.authorization = `Bearer ${config.githubToken}`
  }
  return result
}

function sourceContext(config, store) {
  return { store, timeoutMs: config.requestTimeoutMs }
}

function compareNumericVersionsDescending(left, right) {
  const a = String(left).split('.').map(Number)
  const b = String(right).split('.').map(Number)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (b[index] || 0) - (a[index] || 0)
    if (difference) return difference
  }
  return 0
}

async function getPaper(config, store) {
  const context = sourceContext(config, store)
  const projectResponse = await fetchCachedJson({ id: 'paper-project', url: PAPER_PROJECT, headers: headers(config), ...context })
  const project = projectResponse.payload
  const versions = [...new Set(Object.values(project.versions || {}).flat())]
    .filter((version) => /^\d+(?:\.\d+)*$/.test(version))
    .sort(compareNumericVersionsDescending)
    .slice(0, 20)

  for (const version of versions) {
    const buildsUrl = `${PAPER_PROJECT}/versions/${encodeURIComponent(version)}/builds`
    const buildsResponse = await fetchCachedJson({ id: `paper-builds-${version}`, url: buildsUrl, headers: headers(config), ...context })
    const builds = buildsResponse.payload
    const build = builds.filter((item) => item.channel === 'STABLE')
      .sort((left, right) => Number(right.id) - Number(left.id))[0]
    if (!build) continue
    const download = build.downloads?.['server:default']
    return {
      id: 'paper',
      name: 'Paper',
      target: `${version}-${build.id}`,
      sourceUrl: buildsUrl,
      projectUrl: 'https://papermc.io/software/paper',
      downloadUrl: download?.url || null,
      changelogUrl: 'https://github.com/PaperMC/Paper/commits/main/',
      publishedAt: build.time || null,
      summary: sanitizeText((build.commits || []).slice(0, 10).map((commit) => commit.message).join('\n'), 4_000),
      sourceUp: projectResponse.cache !== 'stale' && buildsResponse.cache !== 'stale',
      cacheStatus: projectResponse.cache === 'stale' || buildsResponse.cache === 'stale' ? 'stale' : projectResponse.cache === 'revalidated' && buildsResponse.cache === 'revalidated' ? 'revalidated' : 'fresh',
      cacheWarning: sanitizeText([projectResponse.warning, buildsResponse.warning].filter(Boolean).join('; '), 1_000) || null,
    }
  }
  throw new Error('Paper API returned no stable build in the latest 20 release versions')
}

async function getGeyserProject(config, store, id, name, artifact) {
  const url = `${GEYSER_API}/${id}/versions/latest/builds/latest`
  const response = await fetchCachedJson({ id, url, headers: headers(config), ...sourceContext(config, store) })
  const build = response.payload
  if (!build.version || !Number.isInteger(build.build)) throw new Error(`${name} API response is missing version/build`)
  if (build.channel && build.channel !== 'default') throw new Error(`${name} latest build is not on the default channel`)
  return {
    id,
    name,
    target: `${build.version}+${build.build}`,
    sourceUrl: url,
    projectUrl: `https://geysermc.org/download/?project=${id}`,
    downloadUrl: `${url}/downloads/${artifact}`,
    changelogUrl: `https://geysermc.org/download/?project=${id}`,
    publishedAt: build.time || null,
    summary: sanitizeText((build.changes || []).slice(0, 10).map((change) => change.summary || change.message).filter(Boolean).join('\n'), 4_000),
    sourceUp: response.cache !== 'stale',
    cacheStatus: response.cache === 'stale' ? 'stale' : response.cache === 'revalidated' ? 'revalidated' : 'fresh',
    cacheWarning: sanitizeText(response.warning || '', 1_000) || null,
    releaseChannel: build.channel || 'default',
  }
}

async function getGithubRelease(config, store, { id, name, repository, assetPattern }) {
  const url = `${GITHUB_API}/${repository}/releases/latest`
  const response = await fetchCachedJson({ id, url, headers: headers(config, true), ...sourceContext(config, store) })
  const release = response.payload
  if (!release.tag_name || release.draft || release.prerelease) throw new Error(`${name} has no stable latest release`)
  const asset = (release.assets || []).find((item) => assetPattern.test(item.name || ''))
  return {
    id,
    name,
    target: String(release.tag_name).replace(/^v/i, ''),
    sourceUrl: url,
    projectUrl: `https://github.com/${repository}`,
    downloadUrl: asset?.browser_download_url || null,
    changelogUrl: release.html_url || `https://github.com/${repository}/releases`,
    publishedAt: release.published_at || null,
    summary: sanitizeText(release.body || release.name || '', 4_000),
    sourceUp: response.cache !== 'stale',
    cacheStatus: response.cache === 'stale' ? 'stale' : response.cache === 'revalidated' ? 'revalidated' : 'fresh',
    cacheWarning: sanitizeText(response.warning || '', 1_000) || null,
  }
}

async function capture(id, name, operation) {
  try {
    return { ok: true, ...(await operation()) }
  } catch (error) {
    return { id, name, ok: false, sourceUp: false, cacheStatus: 'unavailable', error: safeError(error) }
  }
}

export async function collectSources(config, store) {
  return Promise.all([
    capture('paper', 'Paper', () => getPaper(config, store)),
    capture('geyser', 'Geyser', () => getGeyserProject(config, store, 'geyser', 'Geyser', 'spigot')),
    capture('floodgate', 'Floodgate', () => getGeyserProject(config, store, 'floodgate', 'Floodgate', 'spigot')),
    capture('viaversion', 'ViaVersion', () => getGithubRelease(config, store, { id: 'viaversion', name: 'ViaVersion', repository: 'ViaVersion/ViaVersion', assetPattern: /^ViaVersion.*\.jar$/i })),
    capture('viabackwards', 'ViaBackwards', () => getGithubRelease(config, store, { id: 'viabackwards', name: 'ViaBackwards', repository: 'ViaVersion/ViaBackwards', assetPattern: /^ViaBackwards.*\.jar$/i })),
    capture('protocollib', 'ProtocolLib', () => getGithubRelease(config, store, { id: 'protocollib', name: 'ProtocolLib', repository: 'dmulloy2/ProtocolLib', assetPattern: /^ProtocolLib.*\.jar$/i })),
    capture('oldcombatmechanics', 'OldCombatMechanics', () => getGithubRelease(config, store, { id: 'oldcombatmechanics', name: 'OldCombatMechanics', repository: 'kernitus/BukkitOldCombatMechanics', assetPattern: /^OldCombatMechanics.*\.jar$/i })),
  ])
}

export const SOURCE_IDS = ['paper', 'geyser', 'floodgate', 'viaversion', 'viabackwards', 'protocollib', 'oldcombatmechanics']
export const internals = { getPaper, getGeyserProject, getGithubRelease }
