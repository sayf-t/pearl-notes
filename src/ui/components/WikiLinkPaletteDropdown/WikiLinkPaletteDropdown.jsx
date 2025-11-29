import React from 'react'
import { createPortal } from 'react-dom'
import { cleanWikiTarget, formatWikiSuggestionMeta } from '../../utils/wiki.js'
import styles from './WikiLinkPaletteDropdown.module.css'

/**
 * Floating palette used to pick or create wiki-style links.
 */
export default function WikiLinkPaletteDropdown ({
  anchor,
  options,
  highlightedIndex,
  query,
  onHover,
  onSelect
}) {
  if (typeof document === 'undefined' || !anchor) return null
  const hasOptions = options.length > 0
  const content = (
    <div
      className={styles.palette}
      style={{ left: `${anchor.left}px`, top: `${anchor.top}px` }}
      role="listbox"
      aria-label="Link to note"
      onMouseDown={(event) => event.preventDefault()}
    >
      {hasOptions ? (
        options.map((option, index) => {
          const key = option.id ?? `${option.title}-${index}`
          const isActive = index === highlightedIndex
          const className = `${styles.item}${isActive ? ` ${styles.itemActive}` : ''}`
          return (
            <button
              key={key}
              type="button"
              className={className}
              role="option"
              aria-selected={isActive}
              onMouseEnter={() => onHover(index)}
              onClick={(event) => {
                event.preventDefault()
                onSelect(option)
              }}
            >
              <span className={styles.title}>{option.title || option.id || '(Untitled)'}</span>
              <span className={styles.meta}>
                {option.isCreateSuggestion ? 'Create new note' : formatWikiSuggestionMeta(option)}
              </span>
            </button>
          )
        })
      ) : (
        <div className={styles.empty}>
          {cleanWikiTarget(query || '') ? 'No matches — keep typing to create.' : 'Type after [[ to link a note.'}
        </div>
      )}
    </div>
  )
  return createPortal(content, document.body)
}

