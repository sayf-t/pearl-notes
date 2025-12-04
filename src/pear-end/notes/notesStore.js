import b4a from 'b4a'
import { randomId as generateRandomId } from '../vault/crypto.js'
import { ensureDrive } from '../vault/hyperdriveClient.js'
import { ensureVaultConfig } from '../vault/vaultConfig.js'
import { queueMirror } from './notesMirror.js'
import { parseNote, serializeNote } from './notesSerialization.js'

const NOTES_DIR = '/notes'
const DOWNLOAD_TIMEOUT_MS = 10000 // 10 seconds

export function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

function nowIso () {
  return new Date().toISOString()
}

function notePath (id) {
  return `${NOTES_DIR}/${id}.md`
}

export async function downloadPath (drive, targetPath) {
  try {
    await withTimeout(drive.download(targetPath), DOWNLOAD_TIMEOUT_MS)
  } catch (err) {
    // Ignore timeout and ENOENT errors - file might not exist or still downloading
    if (err?.code !== 'ENOENT' && !err.message?.includes('timed out')) {
      throw err
    }
  }
}

async function readFileAsString (drive, path) {
  await downloadPath(drive, path)
  const data = await drive.get(path)
  if (!data) throw new Error('Note not found')
  return b4a.toString(data)
}

async function allocateNoteId (drive) {
  let attempt = 0
  while (attempt < 5) {
    const id = generateRandomId()
    const path = notePath(id)
    let existing = null
    try {
      existing = await drive.entry(path)
    } catch {}
    if (!existing) return { id, path }
    attempt++
  }
  const fallbackId = `${Date.now().toString(16)}${Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0')}`
  return { id: fallbackId, path: notePath(fallbackId) }
}

async function readAllNoteNames (drive) {
  const names = []
  try {
    // Use drive.list() for more efficient directory enumeration
    const listStream = drive.list(NOTES_DIR, { recursive: false })
    for await (const entry of listStream) {
      const name = entry.key.replace(NOTES_DIR + '/', '')
      if (name && name.endsWith('.md')) {
        names.push(name)
      }
    }
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err
  }
  return names
}

export async function listNotes () {
  try {
    const cfg = await ensureVaultConfig()
    const { drive } = await ensureDrive({ keyHex: cfg.driveKey })
    const noteFiles = await readAllNoteNames(drive)

    if (noteFiles.length === 0) {
      console.log('[Notes] No notes found in vault')
      return []
    }

    console.log(`[Notes] Loading ${noteFiles.length} notes...`)

    const notes = []
    let loadErrors = 0

    for (const fileName of noteFiles) {
      if (!fileName.endsWith('.md')) continue
      try {
        const raw = await readFileAsString(drive, `${NOTES_DIR}/${fileName}`)
        const parsed = parseNote(raw)
        notes.push({
          id: parsed.id || fileName.replace(/\.md$/, ''),
          title: parsed.title || '(Untitled)',
          createdAt: parsed.createdAt,
          updatedAt: parsed.updatedAt,
          summary: (parsed.body || '').slice(0, 120)
        })
      } catch (err) {
        console.warn(`[Notes] Failed to load note ${fileName}:`, err.message || err)
        loadErrors++
        // Skip this note but continue with others
      }
    }

    notes.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))

    console.log(`[Notes] Loaded ${notes.length} notes${loadErrors > 0 ? ` (${loadErrors} failed)` : ''}`)
    return notes
  } catch (err) {
    console.warn(`[Notes] Failed to list notes, returning empty list: ${err.message || err}`)
    // Return empty list instead of throwing - vault might be empty or still syncing
    return []
  }
}

export async function readNote (id) {
  const { drive } = await ensureDrive()
  const raw = await readFileAsString(drive, notePath(id))
  const parsed = parseNote(raw)
  return {
    id: parsed.id || id,
    title: parsed.title || '',
    body: parsed.body || '',
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt
  }
}

export async function createNote ({ title = '', body = '' }) {
  const { drive } = await ensureDrive()
  const { id, path } = await allocateNoteId(drive)
  const ts = nowIso()
  const note = { id, title, body, createdAt: ts, updatedAt: ts }
  const payload = serializeNote(note)
  await drive.put(path, b4a.from(payload))
  queueMirror(drive)
  return note
}

export async function updateNote (id, { title, body }) {
  const existing = await readNote(id)
  const { drive } = await ensureDrive()
  const ts = nowIso()
  const updated = {
    ...existing,
    id,
    title: title ?? existing.title,
    body: body ?? existing.body,
    createdAt: existing.createdAt || ts,
    updatedAt: ts
  }
  const payload = serializeNote(updated)
  await drive.put(notePath(id), b4a.from(payload))
  queueMirror(drive)
  return updated
}

export async function deleteNote (id) {
  const { drive } = await ensureDrive()
  await downloadPath(drive, notePath(id))
  await drive.del(notePath(id))
  queueMirror(drive)
}