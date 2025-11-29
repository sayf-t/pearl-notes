import test from 'brittle'

import { serializeNote, parseNote } from '../src/pear-end/notes/notesSerialization.js'

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


