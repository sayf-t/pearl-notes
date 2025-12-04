import test from 'brittle'

import { serializeNote, parseNote } from '../src/pear-end/notes/notesSerialization.js'
import { withTimeout, downloadPath, listNotes } from '../src/pear-end/notes/notesStore.js'
import { NOTES_AUTO_REFRESH_INTERVAL_MS } from '../src/ui/constants.js'
import { __setEnsureDriveForTests } from '../src/pear-end/vault/vaultConfig.js'

async function withFakeLocalStorage (fn) {
  const original = globalThis.localStorage
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  }
  try {
    return await fn(store)
  } finally {
    globalThis.localStorage = original
  }
}

// Create a separate test file for useNotesWorkspace hook tests
// This will test the note clicking functionality

test('notesStore: serializeNote produces front-matter plus body', (t) => {
  const note = {
    id: '123',
    title: 'Test',
    body: 'Hello world\n\nMore text',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z'
  }

  const raw = serializeNote(note)

  t.ok(raw.startsWith('---\n'), 'starts with front-matter delimiter')
  t.ok(raw.includes('\nid: 123\n'), 'contains id line')
  t.ok(raw.includes('\ntitle: Test\n'), 'contains title line')
  t.ok(raw.includes('\ncreatedAt: 2024-01-01T00:00:00.000Z\n'), 'contains createdAt line')
  t.ok(raw.includes('\nupdatedAt: 2024-01-02T00:00:00.000Z\n'), 'contains updatedAt line')
  t.ok(raw.endsWith(note.body), 'body is preserved at the end')
})

test('notesStore: parseNote round-trips with serializeNote', (t) => {
  const original = {
    id: 'abc',
    title: 'Roundtrip',
    body: 'Body content',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T01:00:00.000Z'
  }

  const raw = serializeNote(original)
  const parsed = parseNote(raw)

  t.is(parsed.id, original.id)
  t.is(parsed.title, original.title)
  t.is(parsed.body, original.body)
  t.is(parsed.createdAt, original.createdAt)
  t.is(parsed.updatedAt, original.updatedAt)
})

test('notesStore: parseNote tolerates missing front-matter', (t) => {
  const bodyOnly = 'Just some text without front-matter'
  const parsed = parseNote(bodyOnly)

  t.is(parsed.id, null)
  t.is(parsed.title, '')
  t.is(parsed.createdAt, null)
  t.is(parsed.updatedAt, null)
  t.is(parsed.body, bodyOnly)
})

test('notesStore: withTimeout resolves with successful promise', async (t) => {
  const promise = Promise.resolve('success')
  const result = await withTimeout(promise, 1000)
  t.is(result, 'success')
})

test('notesStore: withTimeout rejects on timeout', async (t) => {
  const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 100))
  const timeoutMs = 50

  await t.exception(
    () => withTimeout(slowPromise, timeoutMs),
    /timed out after 50ms/,
    'should reject with timeout error'
  )
})

test('notesStore: withTimeout rejects immediately on promise rejection', async (t) => {
  const failingPromise = Promise.reject(new Error('promise failed'))

  await t.exception(
    () => withTimeout(failingPromise, 1000),
    /promise failed/,
    'should reject with original error'
  )
})

test('notesStore: downloadPath handles successful download', async (t) => {
  const mockDrive = {
    download: async () => Promise.resolve()
  }

  await downloadPath(mockDrive, '/test/path')
  t.pass('successful download completed without error')
})

test('notesStore: downloadPath handles timeout gracefully', async (t) => {
  const mockDrive = {
    download: () => new Promise(resolve => setTimeout(resolve, 100))
  }

  // Should not throw - timeout errors are caught internally
  await downloadPath(mockDrive, '/test/path')
  t.pass('timeout handled gracefully')
})

test('notesStore: downloadPath handles ENOENT errors gracefully', async (t) => {
  const mockDrive = {
    download: async () => {
      const error = new Error('file not found')
      error.code = 'ENOENT'
      throw error
    }
  }

  // Should not throw - ENOENT errors are caught internally
  await downloadPath(mockDrive, '/test/path')
  t.pass('ENOENT error handled gracefully')
})

test('notesStore: downloadPath throws on other download errors', async (t) => {
  const mockDrive = {
    download: async () => {
      throw new Error('network error')
    }
  }

  await t.exception(
    () => downloadPath(mockDrive, '/test/path'),
    /network error/,
    'should throw non-ENOENT and non-timeout errors'
  )
})

test('constants: NOTES_AUTO_REFRESH_INTERVAL_MS is reasonable', (t) => {
  // Should be long enough to avoid excessive refreshes but not too long
  t.ok(NOTES_AUTO_REFRESH_INTERVAL_MS >= 10000, 'should be at least 10 seconds')
  t.ok(NOTES_AUTO_REFRESH_INTERVAL_MS <= 120000, 'should be at most 2 minutes')
  t.is(NOTES_AUTO_REFRESH_INTERVAL_MS, 30000, 'should be 30 seconds')
})



