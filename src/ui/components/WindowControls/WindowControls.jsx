import React, { useState } from 'react'
import { Minus, Maximize2, X } from 'lucide-react'
import styles from './WindowControls.module.css'
import ui from 'pear-electron'

/**
 * Window control buttons for minimize, maximize/fullscreen, and close.
 */
export default function WindowControls () {
  const [isMaximized, setIsMaximized] = useState(false)

  if (!ui?.app) {
    return null
  }

  const handleMinimize = () => {
    ui.app.minimize?.()
  }

  const handleToggleMaximize = async () => {
    if (isMaximized) {
      const success = await ui.app.restore?.()
      if (success) setIsMaximized(false)
    } else {
      const success = await ui.app.maximize?.()
      if (success) setIsMaximized(true)
    }
  }

  const handleClose = () => {
    ui.app.close?.() || window.Pear?.exit?.()
  }

  return (
    <div className={styles.windowControls}>
      <button
        type="button"
        className={styles.windowControlBtn}
        onClick={handleMinimize}
        aria-label="Minimize window"
        title="Minimize"
      >
        <Minus size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={styles.windowControlBtn}
        onClick={handleToggleMaximize}
        aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
        title={isMaximized ? 'Restore window' : 'Maximize window'}
      >
        <Maximize2 size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`${styles.windowControlBtn} ${styles.closeBtn}`}
        onClick={handleClose}
        aria-label="Close window"
        title="Close"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}
