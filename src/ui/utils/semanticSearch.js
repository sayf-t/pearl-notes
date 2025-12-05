const DEFAULT_LIMIT = 20
const SNIPPET_WINDOW = 48

function normalize (value = '') {
  return value.toLowerCase()
}

function scoreText (text, tokens, { titleWeight = 1 }) {
  if (!text) return 0
  const haystack = normalize(text)
  let score = 0

  for (const token of tokens) {
    if (!token) continue
    const exact = haystack.includes(token)
    if (exact) {
      score += 6 * titleWeight
      if (haystack.startsWith(token)) score += 2 * titleWeight
      continue
    }

    // Lightweight fuzzy: reward partial overlaps of token characters
    let overlap = 0
    for (let i = 0; i < haystack.length && i < token.length; i++) {
      if (haystack[i] === token[i]) overlap++
    }
    if (overlap >= Math.max(2, Math.ceil(token.length / 2))) {
      score += 2 * titleWeight
    }
  }

  return score
}

function buildSnippet (text = '', tokens) {
  const normalized = normalize(text)
  let bestIndex = -1
  let bestToken = ''

  for (const token of tokens) {
    const idx = token ? normalized.indexOf(token) : -1
    if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
      bestIndex = idx
      bestToken = token
    }
  }

  if (bestIndex === -1) {
    const trimmed = text.trim()
    return trimmed.length > SNIPPET_WINDOW ? `${trimmed.slice(0, SNIPPET_WINDOW)}…` : trimmed
  }

  const start = Math.max(0, bestIndex - SNIPPET_WINDOW / 2)
  const end = Math.min(text.length, start + SNIPPET_WINDOW)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  const snippet = text.slice(start, end).trim()

  return `${prefix}${snippet}${suffix}`
}

/**
 * Rank notes against a query using lightweight semantic-ish scoring.
 * Returns the original note fields plus a score and snippet for display.
 */
export function semanticSearch (notes = [], query = '', options = {}) {
  const limit = typeof options.limit === 'number' ? options.limit : DEFAULT_LIMIT
  const trimmed = query.trim()
  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean)

  if (!trimmed) {
    return notes.slice(0, limit).map((note, index) => ({
      ...note,
      score: notes.length - index,
      snippet: note.summary || ''
    }))
  }

  const results = []

  for (const note of notes) {
    const title = note.title || ''
    const summary = note.summary || note.body || ''
    const titleScore = scoreText(title, tokens, { titleWeight: 1.5 })
    const summaryScore = scoreText(summary, tokens, { titleWeight: 1 })
    const recencyBoost = typeof note.updatedAt === 'string' ? 1 : 0
    const totalScore = titleScore * 2 + summaryScore + recencyBoost

    if (totalScore <= 0) continue

    results.push({
      ...note,
      score: totalScore,
      snippet: buildSnippet(summary || title, tokens)
    })
  }

  return results
    .sort((a, b) => b.score - a.score || (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, limit)
}
