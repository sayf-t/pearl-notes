import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './Modal.module.css'

const MODAL_ROOT_ID = 'pear-modal-root'

function ensureModalRoot () {
  if (typeof document === 'undefined') return null
  let root = document.getElementById(MODAL_ROOT_ID)
  if (!root) {
    root = document.createElement('div')
    root.id = MODAL_ROOT_ID
    document.body.appendChild(root)
  }
  return root
}

export function Modal ({
  open,
  title,
  onClose,
  children,
  closeLabel = 'Close',
  allowBackdropDismiss = true
}) {
  const modalRoot = ensureModalRoot()

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        onClose?.(event)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open || !modalRoot) return null

  const handleBackdropClick = (event) => {
    if (!allowBackdropDismiss) return
    if (event.target === event.currentTarget) {
      onClose?.(event)
    }
  }

  return createPortal(
    <div className={styles.backdrop} onMouseDown={handleBackdropClick} role="dialog" aria-modal="true">
      <div className={styles.modal} onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label={closeLabel}
            title={closeLabel}
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    modalRoot
  )
}

export default Modal

