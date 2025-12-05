import React from 'react'
import { createRoot } from 'react-dom/client'

export function showReactModal (Component, props = {}) {
  if (typeof document === 'undefined') {
    console.warn('[Modal] Cannot render modal on the server.')
    return null
  }

  const container = document.createElement('div')
  document.body.appendChild(container)

  const { onClose: userOnClose, ...restProps } = props
  const root = createRoot(container)

  const handleClose = (reason) => {
    userOnClose?.(reason)
    root.unmount()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  }

  root.render(<Component {...restProps} onClose={handleClose} />)

  return {
    close: handleClose,
    update: (nextProps = {}) => {
      const { onClose: nextOnClose, ...other } = nextProps
      const mergedClose = (reason) => {
        nextOnClose?.(reason)
        handleClose(reason)
      }
      root.render(<Component {...restProps} {...other} onClose={mergedClose} />)
    }
  }
}

