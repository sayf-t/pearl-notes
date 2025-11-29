import { useCallback, useEffect, useMemo, useState } from 'react'
import { calculateWikiAnchor, cleanWikiTarget, detectWikiTrigger, normalizeWikiKey } from '../../utils/wiki.js'
import { WIKI_MENU_MAX_RESULTS } from '../../constants.js'

export function useWikiPalette ({ notes }) {
  const [wikiPalette, setWikiPalette] = useState(null)

  const closeWikiPalette = useCallback(() => setWikiPalette(null), [])

  const refreshWikiPalette = useCallback((value, caretIndex, element) => {
    if (!element || caretIndex == null) {
      setWikiPalette(null)
      return
    }
    const trigger = detectWikiTrigger(value, caretIndex)
    if (!trigger) {
      setWikiPalette(null)
      return
    }
    const anchor = calculateWikiAnchor(element, caretIndex)
    if (!anchor) {
      setWikiPalette(null)
      return
    }
    setWikiPalette((prev) => {
      const sameQuery = prev?.query === trigger.query
      return {
        triggerStart: trigger.start,
        caretIndex,
        query: trigger.query,
        anchor,
        selectedIndex: sameQuery ? prev?.selectedIndex ?? 0 : 0
      }
    })
  }, [])

  const wikiSuggestions = useMemo(() => {
    if (!wikiPalette) return []
    const trimmedQuery = cleanWikiTarget(wikiPalette.query || '')
    const normalizedQuery = normalizeWikiKey(trimmedQuery)
    const baseMatches = notes
      .filter((note) => {
        if (!note) return false
        const compare = normalizeWikiKey(note.title || note.id || '')
        if (!normalizedQuery) return true
        return compare.includes(normalizedQuery)
      })
      .slice(0, WIKI_MENU_MAX_RESULTS)
    const options = [...baseMatches]
    if (trimmedQuery) {
      const alreadyExists = baseMatches.some(
        (note) => normalizeWikiKey(note.title || note.id || '') === normalizedQuery
      )
      if (!alreadyExists) {
        options.push({
          id: `__create__:${trimmedQuery}`,
          title: trimmedQuery,
          isCreateSuggestion: true
        })
      }
    }
    return options
  }, [wikiPalette, notes])

  useEffect(() => {
    setWikiPalette((prev) => {
      if (!prev) return prev
      const maxIndex = Math.max(0, wikiSuggestions.length - 1)
      if (prev.selectedIndex > maxIndex) {
        return { ...prev, selectedIndex: maxIndex }
      }
      return prev
    })
  }, [wikiSuggestions.length])

  const highlightNext = useCallback(() => {
    setWikiPalette((prev) => {
      if (!prev || !wikiSuggestions.length) return prev
      const nextIndex = (prev.selectedIndex + 1) % wikiSuggestions.length
      return { ...prev, selectedIndex: nextIndex }
    })
  }, [wikiSuggestions.length])

  const highlightPrevious = useCallback(() => {
    setWikiPalette((prev) => {
      if (!prev || !wikiSuggestions.length) return prev
      const nextIndex = (prev.selectedIndex - 1 + wikiSuggestions.length) % wikiSuggestions.length
      return { ...prev, selectedIndex: nextIndex }
    })
  }, [wikiSuggestions.length])

  const handleWikiOptionHover = useCallback((index) => {
    setWikiPalette((prev) => {
      if (!prev) return prev
      return { ...prev, selectedIndex: index }
    })
  }, [])

  return {
    wikiPalette,
    wikiSuggestions,
    refreshWikiPalette,
    closeWikiPalette,
    highlightNext,
    highlightPrevious,
    handleWikiOptionHover
  }
}

