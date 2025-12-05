import React from 'react'
import Modal from '../Modal/Modal.jsx'
import { THEME_SEQUENCE } from '../../constants.js'
import { capitalize } from '../../utils/text.js'

export default function ThemePickerModal ({ manager, themeState, onClose }) {
  const currentKey = `${themeState?.themeId}:${themeState?.colorMode}`

  const handleSelect = (themeId, colorMode) => {
    manager?.setTheme?.(themeId)
    manager?.setColorMode?.(colorMode)
    onClose?.()
  }

  return (
    <Modal open title="Choose a theme" onClose={onClose}>
      <div className="theme-picker">
        <p className="theme-picker-intro">Tap a card to switch both palette and tone.</p>
        {THEME_SEQUENCE.map((theme) => (
          <div key={theme} className="theme-card-row">
            {['light', 'dark'].map((mode) => {
              const key = `${theme}:${mode}`
              const isActive = key === currentKey
              return (
                <button
                  key={key}
                  type="button"
                  className={`theme-card${isActive ? ' theme-card--active' : ''}`}
                  data-theme-key={key}
                  onClick={() => handleSelect(theme, mode)}
                >
                  <div className={`theme-card-preview theme-card-preview--${theme} theme-card-preview--${mode}`} />
                  <div className="theme-card-label">
                    <strong>{capitalize(theme)}</strong>
                    <span>{capitalize(mode)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </Modal>
  )
}

