export function capitalize (value = '') {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function truncateText (value, maxLength = 48) {
  if (!value) return ''
  const normalized = value.trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

