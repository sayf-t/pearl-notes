import React from 'react'
import { createRoot } from 'react-dom/client'
import Sidebar from '../components/Sidebar'
import { getSwal } from './modal.js'

export function openNotesModal ({ sidebarProps, onClose } = {}) {
  const SwalLib = getSwal()
  if (!SwalLib) return null

  const container = document.createElement('div')
  let root = null
  let latestProps = sidebarProps

  const renderSidebar = (props) => {
    latestProps = props
    if (!root) return
    root.render(
      <Sidebar
        {...props}
        variant="modal"
        showCollapseToggle={false}
        sidebarCollapsed={false}
      />
    )
  }

  const cleanup = () => {
    if (root) {
      root.unmount()
      root = null
    }
  }

  SwalLib.fire({
    html: container,
    customClass: {
      popup: 'notes-modal',
      htmlContainer: 'notes-modal__body'
    },
    showConfirmButton: false,
    showCloseButton: true,
    focusConfirm: false,
    buttonsStyling: false,
    width: 'auto',
    didOpen: () => {
      root = createRoot(container)
      renderSidebar(latestProps)
      const popup = SwalLib.getPopup()
      if (popup) {
        popup.setAttribute('aria-label', 'Notes list')
      }
    },
    willClose: () => {
      cleanup()
      onClose?.()
    }
  })

  return {
    update: (props) => {
      renderSidebar(props || latestProps)
    },
    close: () => {
      SwalLib.close()
    }
  }
}

