import React from 'react'
import styles from './Sidebar.module.css'

/**
 * Keyboard-friendly list option for the notes sidebar.
 */
export default function NoteListItem ({ note, meta, isActive, onSelect }) {
  const className = `${styles.notesListItem}${isActive ? ` ${styles.notesListItemActive}` : ''}`
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  const handleClick = () => {
    onSelect()
  }

  return (
    <li
      className={className}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.notesListTitle}>{note.title || '(Untitled)'}</div>
      <div className={styles.notesListMeta}>{meta}</div>
    </li>
  )
}


