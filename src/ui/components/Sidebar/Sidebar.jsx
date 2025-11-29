import React from 'react'
import {
  ChevronsLeft,
  ChevronsRight,
  Eye,
  FilePlus2,
  LayoutPanelTop,
  Palette,
  Share2,
  SquarePen,
  Type,
  Trash2
} from 'lucide-react'
import { FONT_STYLES } from '../../constants.js'
import styles from './Sidebar.module.css'
import NoteListItem from './NoteListItem.jsx'

/**
 * Shell around the notes list, primary actions, and contextual buttons.
 */
export default function Sidebar ({
  notes = [],
  selectedNoteId,
  sidebarCollapsed = false,
  onSelectNote,
  onNewNote,
  onDeleteNote,
  onToggleSidebar,
  onVaultShare,
  onThemePicker,
  formatNoteMeta = () => '',
  previewMode = 'editor',
  previewButtonLabel,
  onPreviewToggle,
  onCopyVaultKey,
  hasVaultKey = false,
  onStatusBarToggle,
  isStatusBarVisible = true,
  fontStyle = 'system',
  onFontChange,
  variant = 'inline',
  showCollapseToggle = true
}) {
  const isModal = variant === 'modal'
  const canCollapse = showCollapseToggle && !isModal && typeof onToggleSidebar === 'function'
  const sidebarLabel = sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'
  const ToggleIcon = sidebarCollapsed ? ChevronsRight : ChevronsLeft
  const shouldApplyCollapsedClass = canCollapse && sidebarCollapsed
  const sidebarShellClass = [
    styles.sidebarShell,
    variant === 'inline' ? styles.sidebarShellInline : '',
    shouldApplyCollapsedClass ? styles.sidebarShellCollapsed : '',
    isModal ? styles.sidebarShellModal : ''
  ]
    .filter(Boolean)
    .join(' ')
  const sidebarActionsClass = `${styles.sidebarActions}${shouldApplyCollapsedClass ? ` ${styles.sidebarActionsCollapsed}` : ''}${
    isModal ? ` ${styles.sidebarActionsModal}` : ''
  }`
  const sidebarClass = `${styles.sidebar}${shouldApplyCollapsedClass ? ` ${styles.sidebarCollapsed}` : ''}`
  const canShareVault = typeof onVaultShare === 'function'
  const canTogglePreview = typeof onPreviewToggle === 'function'
  const canCopyKey = typeof onCopyVaultKey === 'function'
  const canToggleStatusBar = typeof onStatusBarToggle === 'function'
  const canChangeFont = typeof onFontChange === 'function'
  const PreviewIcon = previewMode === 'preview' ? SquarePen : Eye
  const previewToggleLabel = previewButtonLabel || 'Toggle preview'
  const statusBarToggleLabel = isStatusBarVisible ? 'Hide status bar' : 'Show status bar'
  const fontMenuLabel = 'Change font style'
  return (
    <div className={sidebarShellClass}>
      <div className={sidebarActionsClass}>
        {canCollapse ? (
          <button
            className="icon-btn"
            type="button"
            aria-label={sidebarLabel}
            title={sidebarLabel}
            onClick={onToggleSidebar}
          >
            <ToggleIcon size={18} aria-hidden="true" />
          </button>
        ) : null}
        {canTogglePreview ? (
          <button
            className="icon-btn"
            type="button"
            aria-label={previewToggleLabel}
            title={previewToggleLabel}
            aria-pressed={previewMode === 'preview'}
            onClick={onPreviewToggle}
          >
            <PreviewIcon size={18} aria-hidden="true" />
          </button>
        ) : null}
        {/* {canCopyKey ? (
          <button
            className="icon-btn"
            type="button"
            aria-label="Copy vault key"
            title="Copy vault key"
            onClick={onCopyVaultKey}
            disabled={!hasVaultKey}
          >
            <Copy size={18} aria-hidden="true" />
          </button>
        ) : null} */}
        {canShareVault ? (
          <button
            className="icon-btn"
            type="button"
            aria-label="Share or join a vault"
            title="Share or join a vault"
            onClick={onVaultShare}
          >
            <Share2 size={18} aria-hidden="true" />
          </button>
        ) : null}
        {canChangeFont ? (
          <div className={styles.fontMenuTrigger} title={fontMenuLabel} aria-label={fontMenuLabel}>
            <Type size={16} aria-hidden="true" />
            <select
              className={styles.fontMenuSelect}
              value={fontStyle}
              onChange={onFontChange}
              aria-label={fontMenuLabel}
            >
              {FONT_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      <aside className={sidebarClass} aria-label="Notes list">
        <div className={styles.fieldLabel}>Notes</div>
        <ul className={styles.notesList} role="list">
          {notes.length === 0 ? (
            <li className={styles.notesListItem}>No notes yet.</li>
          ) : (
            notes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                meta={formatNoteMeta(note)}
                isActive={note.id === selectedNoteId}
                onSelect={() => onSelectNote(note.id)}
              />
            ))
          )}
        </ul>
        <div className={styles.buttonRow}>
          <button
            className="btn btn-primary btn-icon-only"
            type="button"
            aria-label="New note"
            title="New note"
            onClick={onNewNote}
          >
            <FilePlus2 size={18} aria-hidden="true" />
          </button>
          <button
            className="btn btn-danger btn-icon-only"
            type="button"
            aria-label="Delete note"
            title="Delete note"
            disabled={!selectedNoteId}
            onClick={onDeleteNote}
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.sidebarFooter}>
          <button
            className="icon-btn"
            type="button"
            aria-label="Choose theme"
            title="Choose theme"
            onClick={onThemePicker}
          >
            <Palette size={18} aria-hidden="true" />
          </button>
          {canToggleStatusBar ? (
            <button
              className="icon-btn"
              type="button"
              aria-label={statusBarToggleLabel}
              title={statusBarToggleLabel}
              aria-pressed={isStatusBarVisible}
              onClick={onStatusBarToggle}
            >
              <LayoutPanelTop size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

