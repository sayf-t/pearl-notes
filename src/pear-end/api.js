// Thin API layer that exposes vault-related helpers to the core/UI.
// This is intentionally small; most logic lives in vaultConfig and sync/.

import { ensureVaultConfig, createLinkString, applyLinkString, getRecentVaults } from './vault/vaultConfig.js'
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

export async function vaultGetStatus () {
  const cfg = await ensureVaultConfig()
  const { peerCount } = await ensureDrive()
  const connected = peerCount > 0 || syncActive
  peersCount = peerCount
  const exportDir = await getNotesFilesPath()
  return {
    driveKey: cfg.driveKey,
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

