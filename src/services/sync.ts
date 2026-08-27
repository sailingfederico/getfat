import { db, getSetting, setSetting } from '../db/database'
import type { FoodLog, Targets } from '../types'

const GITHUB_API = 'https://api.github.com'
const FILE_PATH = 'getfat-data.json'
const BRANCH = 'data'

interface SyncData {
  version: 1
  exportedAt: string
  foodLogs: FoodLog[]
  targets: Targets[]
}

let syncTimer: ReturnType<typeof setTimeout> | null = null

async function getConfig() {
  const [token, repo] = await Promise.all([
    getSetting('github_token'),
    getSetting('github_repo'),
  ])
  if (!token || !repo) return null
  return { token, repo }
}

async function ghFetch(repo: string, token: string, path: string, init?: RequestInit) {
  return fetch(`${GITHUB_API}/repos/${repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

export async function pullFromGitHub(): Promise<{ ok: boolean; message: string }> {
  const config = await getConfig()
  if (!config) return { ok: false, message: 'GitHub not configured' }

  try {
    const res = await ghFetch(config.repo, config.token,
      `/contents/${FILE_PATH}?ref=${BRANCH}`)

    if (res.status === 404) return { ok: false, message: 'No backup found on GitHub' }
    if (!res.ok) return { ok: false, message: `GitHub error: ${res.status}` }

    const file = await res.json()
    const raw = atob(file.content.replace(/\n/g, ''))
    const json: SyncData = JSON.parse(decodeURIComponent(escape(raw)))

    await setSetting('github_data_sha', file.sha)

    await db.transaction('rw', db.foodLogs, db.targets, async () => {
      await db.foodLogs.clear()
      await db.targets.clear()
      if (json.foodLogs?.length) await db.foodLogs.bulkPut(json.foodLogs)
      if (json.targets?.length) await db.targets.bulkPut(json.targets)
    })

    await setSetting('last_sync', new Date().toISOString())
    return { ok: true, message: `Restored ${json.foodLogs?.length ?? 0} logs from GitHub` }
  } catch (e: unknown) {
    return { ok: false, message: e instanceof Error ? e.message : 'Pull failed' }
  }
}

export async function pushToGitHub(): Promise<{ ok: boolean; message: string }> {
  const config = await getConfig()
  if (!config) return { ok: false, message: 'GitHub not configured' }

  try {
    const data: SyncData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      foodLogs: await db.foodLogs.toArray(),
      targets: await db.targets.toArray(),
    }
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))))

    const branchRes = await ghFetch(config.repo, config.token, `/branches/${BRANCH}`)
    if (branchRes.status === 404) {
      return createDataBranch(config, content)
    }

    let sha = await getSetting('github_data_sha')

    // If we don't have a cached SHA, fetch it
    if (!sha) {
      const fileRes = await ghFetch(config.repo, config.token,
        `/contents/${FILE_PATH}?ref=${BRANCH}`)
      if (fileRes.ok) {
        const f = await fileRes.json()
        sha = f.sha
      }
    }

    const body: Record<string, string> = {
      message: `sync: ${new Date().toISOString().split('T')[0]}`,
      content,
      branch: BRANCH,
    }
    if (sha) body.sha = sha

    let putRes = await ghFetch(config.repo, config.token,
      `/contents/${FILE_PATH}`, { method: 'PUT', body: JSON.stringify(body) })

    // SHA mismatch — refetch and retry once
    if (putRes.status === 409 || putRes.status === 422) {
      const cur = await ghFetch(config.repo, config.token,
        `/contents/${FILE_PATH}?ref=${BRANCH}`)
      if (cur.ok) {
        const f = await cur.json()
        body.sha = f.sha
        putRes = await ghFetch(config.repo, config.token,
          `/contents/${FILE_PATH}`, { method: 'PUT', body: JSON.stringify(body) })
      }
    }

    if (!putRes.ok) return { ok: false, message: `Push failed: ${putRes.status}` }

    const result = await putRes.json()
    await setSetting('github_data_sha', result.content.sha)
    await setSetting('last_sync', new Date().toISOString())
    return { ok: true, message: 'Synced to GitHub' }
  } catch (e: unknown) {
    return { ok: false, message: e instanceof Error ? e.message : 'Push failed' }
  }
}

async function createDataBranch(
  config: { token: string; repo: string },
  content: string,
): Promise<{ ok: boolean; message: string }> {
  const f = (path: string, init?: RequestInit) => ghFetch(config.repo, config.token, path, init)
  try {
    const blobRes = await f('/git/blobs', {
      method: 'POST', body: JSON.stringify({ content, encoding: 'base64' }),
    })
    if (!blobRes.ok) return { ok: false, message: 'Failed to create blob' }
    const blob = await blobRes.json()

    const treeRes = await f('/git/trees', {
      method: 'POST',
      body: JSON.stringify({ tree: [{ path: FILE_PATH, mode: '100644', type: 'blob', sha: blob.sha }] }),
    })
    if (!treeRes.ok) return { ok: false, message: 'Failed to create tree' }
    const tree = await treeRes.json()

    const commitRes = await f('/git/commits', {
      method: 'POST',
      body: JSON.stringify({ message: 'init: GetFat data storage', tree: tree.sha, parents: [] }),
    })
    if (!commitRes.ok) return { ok: false, message: 'Failed to create commit' }
    const commit = await commitRes.json()

    const refRes = await f('/git/refs', {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: commit.sha }),
    })
    if (!refRes.ok) return { ok: false, message: 'Failed to create branch' }

    // Cache the file SHA
    const fileRes = await f(`/contents/${FILE_PATH}?ref=${BRANCH}`)
    if (fileRes.ok) {
      const file = await fileRes.json()
      await setSetting('github_data_sha', file.sha)
    }

    await setSetting('last_sync', new Date().toISOString())
    return { ok: true, message: 'Data branch created and synced' }
  } catch (e: unknown) {
    return { ok: false, message: e instanceof Error ? e.message : 'Branch creation failed' }
  }
}

export function requestSync() {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => { pushToGitHub() }, 3000)
}

export async function isSyncConfigured(): Promise<boolean> {
  const config = await getConfig()
  return config !== null
}

export async function autoSyncOnStartup(): Promise<{ ok: boolean; message: string } | null> {
  const configured = await isSyncConfigured()
  if (!configured) return null

  const logCount = await db.foodLogs.count()
  if (logCount === 0) {
    return pullFromGitHub()
  } else {
    // Local has data — push backup
    return pushToGitHub()
  }
}
