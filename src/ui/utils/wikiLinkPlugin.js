const OPEN = '[['
const CLOSE = ']]'

function collapseWhitespace (value = '') {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function wikiLinkPlugin (md, options = {}) {
  const settings = {
    className: 'markdown-wikilink',
    getHref: (target) => `#note/${encodeURIComponent(target)}`,
    ...options
  }

  function wikilink (state, silent) {
    const start = state.pos
    const max = state.posMax

    if (start + OPEN.length >= max) return false
    if (state.src.startsWith(OPEN, start) === false) return false
    if (start > 0 && state.src.charCodeAt(start - 1) === 0x5c) return false

    const closeIndex = state.src.indexOf(CLOSE, start + OPEN.length)
    if (closeIndex === -1) return false

    const rawContent = state.src.slice(start + OPEN.length, closeIndex)
    if (!rawContent.trim()) return false

    const pipeIndex = rawContent.indexOf('|')
    const rawTarget = pipeIndex === -1 ? rawContent : rawContent.slice(0, pipeIndex)
    const rawLabel = pipeIndex === -1 ? rawContent : rawContent.slice(pipeIndex + 1)

    const target = collapseWhitespace(rawTarget)
    const label = collapseWhitespace(rawLabel) || target

    if (!target) return false

    if (!silent) {
      const tokenOpen = state.push('link_open', 'a', 1)
      const href =
        typeof settings.getHref === 'function'
          ? settings.getHref(target)
          : `#note/${encodeURIComponent(target)}`

      tokenOpen.attrs = tokenOpen.attrs || []
      tokenOpen.attrs.push(['href', href])
      tokenOpen.attrs.push(['data-wikilink-target', target])
      tokenOpen.attrs.push(['data-wikilink-label', label])
      if (settings.className) {
        tokenOpen.attrs.push(['class', settings.className])
      }

      const tokenText = state.push('text', '', 0)
      tokenText.content = label

      state.push('link_close', 'a', -1)
    }

    state.pos = closeIndex + CLOSE.length
    return true
  }

  md.inline.ruler.before('link', 'wikilink', wikilink)
}


