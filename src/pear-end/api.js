// Thin API layer that exposes vault-related helpers to the core/UI.
// This is intentionally small; most logic lives in vaultConfig and sync/.

import {
  ensureVaultConfig,
  createLinkString,
  applyLinkString,
  getRecentVaults,
  getCurrentVaultKeySync
} from './vault/vaultConfig.js'
import { restartVaultSync } from './sync/sync.js'
import { ensureDrive } from './vault/hyperdriveClient.js'
import { getNotesFilesPath } from './notes/notesExportConfig.js'

let lastSyncAt = null
let peersCount = 0
let syncActive = false

// These setters are called from the sync layer to keep UI-facing status
// up to date without coupling the sync modules directly to the UI.
export function _setSyncStatus ({ lastSync, peers, connected }) {
  if (lastSync) lastSyncAt = lastSync
  if (typeof peers === 'number') peersCount = peers
  if (typeof connected === 'boolean') syncActive = connected
}

const STATUS_TIMEOUT_MS = 6000

function withTimeout (promise, timeoutMs, label = 'Operation') {
  if (!timeoutMs) return promise
  let timer
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const timeoutError = new Error(`${label} timed out after ${timeoutMs}ms`)
      timeoutError.name = 'VaultEnsureTimeout'
      reject(timeoutError)
    }, timeoutMs)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

async function safeEnsureDriveStatus (driveKey) {
  try {
    return await withTimeout(
      ensureDrive({ keyHex: driveKey || undefined, replicate: false }),
      STATUS_TIMEOUT_MS,
      'Vault status'
    )
  } catch (err) {
    if (err?.name === 'VaultEnsureTimeout') {
      console.warn('[Vault] Status check timed out')
    } else {
      console.warn('[Vault] Failed to fetch drive status', err)
    }
    return null
  }
}

export async function vaultGetStatus () {
  let driveKey = getCurrentVaultKeySync()

  if (!driveKey) {
    try {
      const cfg = await ensureVaultConfig()
      driveKey = cfg.driveKey || driveKey
    } catch (err) {
      console.warn('[Vault] Unable to ensure config while fetching status', err)
    }
  }

  const driveStatus = await safeEnsureDriveStatus(driveKey)
  if (driveStatus?.keyHex && !driveKey) {
    driveKey = driveStatus.keyHex
  }

  if (typeof driveStatus?.peerCount === 'number') {
    peersCount = driveStatus.peerCount
  }

  const connected = peersCount > 0 || syncActive

  let exportDir = null
  try {
    exportDir = await getNotesFilesPath()
  } catch (err) {
    console.warn('[Vault] Export directory unavailable', err)
  }

  return {
    driveKey,
    connected,
    peersCount,
    lastSyncAt,
    exportDir
  }
}

export async function vaultCreateLink () {
  const cfg = await ensureVaultConfig()
  const linkString = createLinkString(cfg)
  return { linkString }
}

export async function vaultJoinLink ({ linkString }) {
  try {
    const next = await applyLinkString(linkString)
    await restartVaultSync({ driveKey: next.driveKey })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message || String(err) }
  }
}

export async function vaultGetRecentList () {
  const cfg = await ensureVaultConfig()
  return {
    currentKey: cfg.driveKey || null,
    recentVaults: getRecentVaults()
  }
}

