import { truncateText } from './text.js'

export function buildNoteLookup (list = []) {
  const map = new Map()
  for (const note of list) {
    if (!note) continue
    const titleKey = normalizeWikiKey(note.title)
    if (titleKey && !map.has(titleKey)) map.set(titleKey, note)
    const idKey = normalizeWikiKey(note.id)
    if (idKey && !map.has(idKey)) map.set(idKey, note)
  }
  return map
}

export function normalizeWikiKey (value = '') {
  if (value === undefined || value === null) return ''
  return String(value)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function cleanWikiTarget (value = '') {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatWikiSuggestionMeta (option) {
  if (!option || option.isCreateSuggestion) return 'Create new note'
  const parts = []
  if (option.updatedAt) {
    try {
      parts.push(
        new Date(option.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      )
    } catch {}
  }
  if (option.summary) {
    parts.push(truncateText(option.summary, 48))
  }
  return parts.join(' · ') || 'Existing note'
}

export function detectWikiTrigger (value = '', caretIndex = 0) {
  if (!value || caretIndex < 0) return null
  const before = value.slice(0, caretIndex)
  const start = before.lastIndexOf('[[')
  if (start === -1) return null
  if (start > 0 && value[start - 1] === '\\') return null
  const between = before.slice(start + 2)
  if (between.includes(']]')) return null
  return { start, query: between }
}

export function calculateWikiAnchor (element, caretIndex) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null
  const caretBox = measureCaretPosition(element, caretIndex)
  if (!caretBox) return null
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1024
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 768
  const dropdownWidth = 320
  const left = clampValue(caretBox.left, 8, viewportWidth - dropdownWidth - 8)
  const top = clampValue(caretBox.top + caretBox.height + 6, 8, viewportHeight - 24)
  return { left, top }
}

export function measureCaretPosition (element, caretIndex) {
  if (!element || typeof window === 'undefined') return null
  const doc = element.ownerDocument
  const computed = window.getComputedStyle(element)
  const properties = [
    'boxSizing',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'letterSpacing',
    'textTransform',
    'textAlign',
    'textIndent',
    'lineHeight',
    'wordBreak'
  ]
  const mirror = doc.createElement('div')
  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.wordWrap = 'break-word'
  const rect = element.getBoundingClientRect()
  mirror.style.top = `${rect.top + window.scrollY}px`
  mirror.style.left = `${rect.left + window.scrollX}px`
  mirror.style.width = `${rect.width}px`
  mirror.style.height = `${rect.height}px`
  mirror.style.overflow = 'auto'
  properties.forEach((prop) => {
    mirror.style[prop] = computed[prop]
  })
  const textBefore = element.value.slice(0, caretIndex)
  mirror.textContent = textBefore
  const marker = doc.createElement('span')
  marker.textContent = element.value.slice(caretIndex) || '\u200b'
  mirror.appendChild(marker)
  doc.body.appendChild(mirror)
  mirror.scrollTop = element.scrollTop
  mirror.scrollLeft = element.scrollLeft
  const markerRect = marker.getBoundingClientRect()
  doc.body.removeChild(mirror)
  const height = markerRect.height || parseFloat(computed.lineHeight) || 18
  const top = markerRect.top - element.scrollTop
  const left = markerRect.left - element.scrollLeft
  return { left, top, height }
}

export function clampValue (value, min, max) {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

