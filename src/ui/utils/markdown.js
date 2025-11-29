export function composeMarkdownDocument ({ title = '', body = '' } = {}) {
  const safeTitle = (title || '').trim()
  const safeBody = normalizeLines(body || '').trim()
  const segments = []
  if (safeTitle) segments.push(`# ${safeTitle}`)
  if (safeBody) segments.push(safeBody)
  return segments.join('\n\n')
}

export function snapshotFromFields ({ title = '', body = '' } = {}) {
  const safeTitle = (title || '').trim()
  const safeBody = normalizeLines(body || '').trim()
  if (!safeTitle && !safeBody) return ''
  return `${safeTitle}\n\n${safeBody}`.trim()
}

export function formatNoteMetaValue (note, markdown) {
  if (!note) return ''
  const parts = []
  if (note.updatedAt) parts.push(new Date(note.updatedAt).toLocaleString())
  const excerpt = buildNoteExcerpt(note, markdown)
  if (excerpt) parts.push(excerpt)
  return parts.join(' · ')
}

export function buildNoteExcerpt (note, markdown) {
  if (!note || typeof document === 'undefined') return ''
  const doc = composeMarkdownDocument({ title: note.title || '', body: note.body || '' })
  if (!doc) return ''
  const scratch = document.createElement('div')
  scratch.innerHTML = markdown.render(doc)
  const text = (scratch.textContent || '').trim()
  return text.length > 80 ? `${text.slice(0, 80)}…` : text
}

function normalizeLines (value = '') {
  return String(value ?? '').replace(/\r\n/g, '\n')
}

