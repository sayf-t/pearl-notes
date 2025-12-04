import React, { useState, useEffect } from 'react'
import { Minus, Maximize2, X } from 'lucide-react'
import styles from './WindowControls.module.css'

/**
 * Window control buttons for minimize, maximize/fullscreen, and close.
 * Only renders on platforms where pear-electron is compatible (not Linux).
 */
export default function WindowControls () {
  const [isMaximized, setIsMaximized] = useState(false)
  const [ui, setUi] = useState(null)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Platform detection - temporarily disable on Linux due to Bare/Electron compatibility issues
    const platform = typeof window !== 'undefined' && window.process?.platform
      ? window.process.platform
      : (typeof process !== 'undefined' ? process.platform : 'unknown')

    // According to Pear docs, Bare modules are incompatible with Electron on Linux
    if (platform === 'linux') {
      setIsSupported(false)
      return
    }

    // Dynamic import to avoid build-time issues
    import('pear-electron')
      .then((uiModule) => {
        setUi(uiModule.default || uiModule)
        setIsSupported(true)
      })
      .catch((error) => {
        console.warn('pear-electron not available:', error.message)
        setIsSupported(false)
      })
  }, [])

  if (!isSupported || !ui?.app) {
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
    if (ui.app.close) {
      ui.app.close()
    } else {
      window.Pear?.exit?.()
    }
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
