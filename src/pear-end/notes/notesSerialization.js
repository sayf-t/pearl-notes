export function serializeNote ({ id, title, body, createdAt, updatedAt }) {
  const header = [
    '---',
    `id: ${id}`,
    `title: ${title || ''}`,
    `createdAt: ${createdAt}`,
    `updatedAt: ${updatedAt}`,
    '---',
    '',
    body || ''
  ]
  return header.join('\n')
}

export function parseNote (raw) {
  const result = { id: null, title: '', createdAt: null, updatedAt: null, body: raw }
  if (!raw?.startsWith?.('---')) return result
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return result
  const header = raw.slice(3, end).trim()
  const body = raw.slice(end + 4).replace(/^\s*\n/, '')
  for (const line of header.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (key === 'id') result.id = value
    else if (key === 'title') result.title = value
    else if (key === 'createdAt') result.createdAt = value
    else if (key === 'updatedAt') result.updatedAt = value
  }
  result.body = body
  return result
}

