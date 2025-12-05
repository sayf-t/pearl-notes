import React from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { FONT_STYLES } from '../../constants.js'
import { capitalize } from '../../utils/text.js'
import styles from './StatusBar.module.css'

/**
 * Sticky footer with sync, status, and font selection controls.
 */
export default function StatusBar ({
  syncText,
  status,
  fontStyle = 'system',
  onFontChange,
  exportDir,
  vaultKey,
  onVaultManagerOpen,
  onSidebarToggle,
  isSidebarOpen,
  showSidebarToggle = false,
  isCollapsed = false,
  onStatusBarToggle
}) {
  const statusToneClass =
    status.tone === 'success'
      ? styles.statusSuccess
      : status.tone === 'error'
        ? styles.statusError
        : styles.statusMuted
  const canChangeFont = typeof onFontChange === 'function'
  const shouldShowSidebarToggle = Boolean(showSidebarToggle && onSidebarToggle)
  const shouldShowControls = canChangeFont || shouldShowSidebarToggle
  const SidebarToggleIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen
  const sidebarToggleLabel = isSidebarOpen ? 'Hide notes list' : 'Show notes list'
  const handleStatusBarToggle = () => {
    onStatusBarToggle?.()
  }

  const vaultKeyPreview = vaultKey ? `${vaultKey.slice(0, 6)}…` : null
  const vaultChipTitleParts = []
  if (vaultKey) vaultChipTitleParts.push(`Drive key: ${vaultKey}`)
  if (exportDir) vaultChipTitleParts.push(`Export: ${exportDir}`)
  const vaultChipTitle = vaultChipTitleParts.join(' • ') || 'Open vault manager'
  const vaultChipAria = vaultKey
    ? `Open vault manager. Current vault key ${vaultKeyPreview}`
    : 'Open vault manager'
  const showVaultChip = Boolean(onVaultManagerOpen)

  if (isCollapsed) {
    return (
      <footer className={`${styles.statusBar} ${styles.statusBarCollapsed}`} aria-label="Status bar hidden">
        {/* <div className={styles.collapsedNotice}>
          <span aria-live="polite">Status bar hidden</span>
          <button className="btn btn-small" type="button" onClick={handleStatusBarToggle}>
            Show status
          </button>
        </div>
        {shouldShowSidebarToggle ? (
          <button
            className={`${styles.sidebarToggleBtn} icon-btn icon-btn--ghost`}
            type="button"
            aria-label={sidebarToggleLabel}
            aria-pressed={isSidebarOpen}
            onClick={onSidebarToggle}
          >
            <SidebarToggleIcon size={18} aria-hidden="true" />
          </button>
        ) : null} */}
      </footer>
    )
  }

  return (
    <footer className={styles.statusBar}>
      <div className={styles.statusBarMeta}>
        <span className={styles.syncStatus}>{syncText || 'Vault key: (loading...)'}</span>
        <span className={`${styles.statusMessage} ${statusToneClass}`} aria-live="polite">
          {status.text}
        </span>
        {showVaultChip ? (
          <button
            type="button"
            className={styles.vaultChip}
            onClick={onVaultManagerOpen}
            disabled={!onVaultManagerOpen}
            aria-label={vaultChipAria}
            title={vaultChipTitle}
          >
            <span className={styles.vaultChipIcon} aria-hidden="true">
              🔐
            </span>
            <span className={styles.vaultChipLabel}>
              {vaultKeyPreview || 'Vault'}
            </span>
          </button>
        ) : null}
      </div>
      {shouldShowControls ? (
        <div className={styles.statusBarControls}>
          {canChangeFont ? (
            <select
              className={styles.fontStyleSelect}
              value={fontStyle}
              onChange={onFontChange}
              aria-label="Change editor font style"
            >
              {FONT_STYLES.map((style) => (
                <option key={style} value={style}>
                  {capitalize(style)}
                </option>
              ))}
            </select>
          ) : null}
          {shouldShowSidebarToggle ? (
            <button
              className={`${styles.sidebarToggleBtn} icon-btn icon-btn--ghost`}
              type="button"
              aria-label={sidebarToggleLabel}
              aria-pressed={isSidebarOpen}
              onClick={onSidebarToggle}
            >
              <SidebarToggleIcon size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
    </footer>
  )
}

