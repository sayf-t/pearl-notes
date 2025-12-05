import React, { useEffect, useMemo, useRef } from 'react'
import { Search } from 'lucide-react'
import styles from './SearchPalette.module.css'

export default function SearchPalette ({
  isOpen,
  query,
  results = [],
  highlightedIndex = -1,
  onClose,
  onQueryChange,
  onSelectResult,
  onHighlightChange
}) {
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const hasAutoSelectedRef = useRef(false)

  const activeIndex = useMemo(() => {
    if (!results.length) return -1
    if (highlightedIndex < 0) return 0
    if (highlightedIndex >= results.length) return results.length - 1
    return highlightedIndex
  }, [results.length, highlightedIndex])

  useEffect(() => {
    if (!isOpen) {
      hasAutoSelectedRef.current = false
      return undefined
    }
    const input = inputRef.current
    if (input) {
      input.focus({ preventScroll: true })
      if (!hasAutoSelectedRef.current) {
        input.select()
        hasAutoSelectedRef.current = true
      }
    }
    const handleKeyDown = (event) => {
      if (!isOpen) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        const next = activeIndex + 1 >= results.length ? 0 : activeIndex + 1
        onHighlightChange?.(next)
        scrollIntoView(next)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        const next = activeIndex - 1 < 0 ? results.length - 1 : activeIndex - 1
        onHighlightChange?.(next)
        scrollIntoView(next)
        return
      }
      if (event.key === 'Enter') {
        if (activeIndex >= 0 && activeIndex < results.length) {
          event.preventDefault()
          onSelectResult?.(results[activeIndex])
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeIndex, results, onClose, onHighlightChange, onSelectResult])

  const scrollIntoView = (index) => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-result-index="${index}"]`)
    if (!el || typeof el.scrollIntoView !== 'function') return
    el.scrollIntoView({ block: 'nearest' })
  }

  if (!isOpen) return null

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Search notes"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.inputRow}>
          <Search size={18} className={styles.searchIcon} aria-hidden="true" />
          <label className={styles.visuallyHidden} htmlFor="command-palette-input">
            Search notes
          </label>
          <input
            id="command-palette-input"
            ref={inputRef}
            className={styles.input}
            placeholder="Search notes…"
            value={query}
            onChange={(event) => onQueryChange?.(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <div className={styles.shortcutHint}>⌘O</div>
        </div>
        <div
          ref={listRef}
          className={styles.results}
          role="listbox"
          aria-label="Search results"
        >
          {results.length === 0 ? (
            <div className={styles.emptyState} role="option" aria-selected="false">
              No results yet. Keep typing to search your notes.
            </div>
          ) : (
            results.map((result, index) => {
              const isActive = index === activeIndex
              return (
                <button
                  key={result.id || index}
                  type="button"
                  className={`${styles.resultRow} ${isActive ? styles.resultRowActive : ''}`}
                  role="option"
                  aria-selected={isActive}
                  data-result-index={index}
                  onMouseEnter={() => onHighlightChange?.(index)}
                  onClick={() => onSelectResult?.(result)}
                >
                  <div className={styles.resultTitle}>{result.title || 'Untitled'}</div>
                  <div className={styles.resultMeta}>
                    {result.snippet || result.summary || 'No preview available.'}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
