// High-level core API that the UI talks to.
// This file composes lower-level vault, sync, and notes modules into a
// friendly interface exposed on window.Pearl via ui.js.

import { ensureVaultConfig, createLinkString, applyLinkString, getPersistedVaultKey } from '../pear-end/vault/vaultConfig.js'
import { getCurrentDriveKey } from '../pear-end/vault/hyperdriveClient.js'
import {
  listNotes as storeListNotes,
  readNote as storeReadNote,
  createNote as storeCreateNote,
  updateNote as storeUpdateNote,
  deleteNote as storeDeleteNote
} from '../pear-end/notes/notesStore.js'
import { startVaultSync as syncStart, restartVaultSync as syncRestart } from '../pear-end/sync/sync.js'
import { vaultGetStatus, _setSyncStatus } from '../pear-end/api.js'

let coreInitialized = false

// Event system for vault operations
const vaultEventTarget = new EventTarget()

export function addVaultEventListener (eventType, listener) {
  vaultEventTarget.addEventListener(eventType, listener)
}

export function removeVaultEventListener (eventType, listener) {
  vaultEventTarget.removeEventListener(eventType, listener)
}

function emitVaultEvent (eventType, detail = {}) {
  const event = new CustomEvent(eventType, { detail })
  vaultEventTarget.dispatchEvent(event)
}

function handleSyncError (err) {
  if (err && err.code === 'ELOCKED') {
    console.warn('[Pearl] Vault storage is already in use; continuing without sync.')
    _setSyncStatus({ connected: false })
    return
  }
  throw err
}

/**
 * Ensure the vault is configured and start background sync.
 * Safe to call multiple times; only the first call does work.
 */
export async function initializeCore () {
  if (coreInitialized) return
  await ensureVaultConfig()
  try {
    await syncStart()
  } catch (err) {
    handleSyncError(err)
  }
  coreInitialized = true
}

/**
 * Force a full restart of the sync subsystem.
 */
export async function restartVaultSync () {
  try {
    await syncRestart()
  } catch (err) {
    handleSyncError(err)
  }
}

/**
 * List all notes in the current vault.
 */
export async function listNotes () {
  await ensureVaultConfig()
  return storeListNotes()
}

/**
 * Read a single note by ID.
 */
export async function getNote (id) {
  await ensureVaultConfig()
  return storeReadNote(id)
}

/**
 * Create a new note or update an existing one.
 * If `id` is provided, the note is updated in-place; otherwise a new note is created.
 */
export async function saveNote ({ id, title = '', body = '' }) {
  await ensureVaultConfig()
  if (id) {
    return storeUpdateNote(id, { title, body })
  }
  return storeCreateNote({ title, body })
}

/**
 * Permanently delete a note by ID.
 */
export async function deleteNote (id) {
  await ensureVaultConfig()
  await storeDeleteNote(id)
}

/**
 * Get the current vault status (path, sync status, peers, last sync time).
 */
export async function getVaultStatus () {
  return vaultGetStatus()
}

/**
 * Produce a shareable pearl-vault:// link for the current vault.
 */
export async function createVaultLink () {
  const cfg = await ensureVaultConfig()
  const linkString = createLinkString(cfg)
  return { linkString }
}

/**
 * Get the current vault drive key, if one exists.
 */
export async function getCurrentVaultKey () {
  const liveKey = getCurrentDriveKey()
  if (liveKey) return liveKey

  const storedKey = getPersistedVaultKey()
  if (storedKey) return storedKey

  const cfg = await ensureVaultConfig()
  return cfg.driveKey || null
}

/**
 * Apply a pearl-vault:// link from another device and restart sync.
 * This is now fire-and-forget; UI should listen for 'vault:joined' events.
 */
export async function joinVaultLink (linkString) {
  console.log('[Vault Join] Starting vault join process...')

  // Validate link synchronously before starting async operation
  const { parseLinkString } = await import('../pear-end/vault/vaultConfig.js')
  const result = parseLinkString(linkString)
  if (result.error) {
    throw new Error(result.error)
  }

  joinVaultLinkAsync(linkString).catch(err => {
    console.error('[Vault Join] Async join failed:', err)
    emitVaultEvent('vault:join-error', { error: err })
  })

  // Return immediately - completion signaled via events
  return { status: 'initiated' }
}

async function joinVaultLinkAsync (linkString) {
  let previousKey = null
  try {
    // Capture the previous key before any changes
    previousKey = await getCurrentVaultKey()

    console.log('[Vault Join] Applying link configuration...')
    const next = await applyLinkString(linkString)
    console.log('[Vault Join] Vault switched successfully')

    // Vault switch is complete - applyLinkString handles drive creation and replication
    // Emit success immediately - content loading happens via automatic refresh
    emitVaultEvent('vault:joined', {
      driveKey: next.driveKey,
      previousKey: previousKey
    })

  } catch (err) {
    console.error('[Vault Join] Join process failed:', err)

    // Emit error event - vault switch failed
    emitVaultEvent('vault:join-error', {
      error: err,
      previousKey: previousKey
    })
    throw err
  }
}

async function getPreviousVaultKey () {
  try {
    // Get the previous key from localStorage before it gets overwritten
    const raw = globalThis?.localStorage?.getItem('pearl-drive-key')
    return raw || null
  } catch {
    return null
  }
}

