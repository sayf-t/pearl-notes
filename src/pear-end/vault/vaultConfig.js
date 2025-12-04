import { ensureDrive as realEnsureDrive } from './hyperdriveClient.js'

const STORAGE_KEY = 'pearl-drive-key'
const DRIVE_KEY_PATTERN = /^[0-9a-fA-F]{64}$/

// Allow tests to inject a fake ensureDrive implementation without
// affecting production behavior. In normal usage this remains the
// real hyperdrive-backed implementation.
let ensureDriveImpl = realEnsureDrive

export function __setEnsureDriveForTests (fn) {
  ensureDriveImpl = typeof fn === 'function' ? fn : realEnsureDrive
}

function normalizeLink (linkString) {
  return linkString?.trim?.() ?? ''
}

// Backwards-compatible reader: accepts either a plain hex key or the
// JSON shape we briefly used during the multi-writer experiment.
function readStoredDriveKey () {
  try {
    const raw = globalThis?.localStorage?.getItem(STORAGE_KEY)
    if (!raw) return null
    // Legacy format: plain 64-char hex key.
    if (DRIVE_KEY_PATTERN.test(raw)) return raw.toLowerCase()
    // Experimental JSON format: { driveKey, secretKey }
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.driveKey === 'string' && DRIVE_KEY_PATTERN.test(parsed.driveKey)) {
        return parsed.driveKey.toLowerCase()
      }
    } catch {}
    return null
  } catch {
    return null
  }
}

function persistDriveKey (keyHex) {
  if (!keyHex) return
  try {
    globalThis?.localStorage?.setItem(STORAGE_KEY, keyHex.toLowerCase())
  } catch {}
}

export async function ensureVaultConfig () {
  const storedKey = readStoredDriveKey()
  const { keyHex } = await ensureDriveImpl({ keyHex: storedKey || undefined })
  if (keyHex && keyHex !== storedKey) persistDriveKey(keyHex)
  return { driveKey: keyHex }
}

export function createLinkString ({ driveKey }) {
  if (!driveKey) throw new Error('Missing drive key for vault link')
  return `pearl-vault://${driveKey}`
}

export function parseLinkString (linkString) {
  const raw = normalizeLink(linkString)
  
  if (!raw) {
    return { error: 'Vault link is empty. Please paste a pearl-vault:// link.' }
  }
  
  if (!raw.startsWith('pearl-vault://')) {
    return { 
      error: `Invalid link format. Expected link to start with "pearl-vault://", but got: ${raw.slice(0, 20)}${raw.length > 20 ? '...' : ''}` 
    }
  }
  
  const withoutScheme = raw.slice('pearl-vault://'.length)
  if (!withoutScheme) {
    return { error: 'Vault link is missing the drive key. Expected format: pearl-vault://<64-character-hex-key>' }
  }
  
  const [keyPart] = withoutScheme.split('?') // tolerate old ?secret=… links, but ignore secret
  
  if (!keyPart) {
    return { error: 'Vault link is missing the drive key after the scheme.' }
  }
  
  if (!DRIVE_KEY_PATTERN.test(keyPart)) {
    const keyLength = keyPart.length
    return { 
      error: `Invalid drive key format. Expected 64 hexadecimal characters, but got ${keyLength} character${keyLength !== 1 ? 's' : ''}. The key should only contain 0-9 and a-f (or A-F).` 
    }
  }
  
  return { driveKey: keyPart.toLowerCase() }
}

export async function applyLinkString (linkString) {
  const result = parseLinkString(linkString)
  if (result.error) {
    throw new Error(result.error)
  }
  if (!result.driveKey) {
    throw new Error('Invalid vault link: unable to parse drive key')
  }
  await ensureDriveImpl({ keyHex: result.driveKey, force: true })
  persistDriveKey(result.driveKey)
  return { driveKey: result.driveKey }
}