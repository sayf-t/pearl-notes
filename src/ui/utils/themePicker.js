import { THEME_SEQUENCE } from '../constants.js'
import { capitalize } from './text.js'
import { getSwal } from './modal.js'

export function openThemePicker (manager, themeState) {
  const SwalLib = getSwal()
  if (!SwalLib) return
  const currentKey = `${themeState.themeId}:${themeState.colorMode}`
  SwalLib.fire({
    title: 'Choose a theme',
    html: renderThemePickerHtml(currentKey),
    customClass: { popup: 'pearl-swal' },
    showConfirmButton: false,
    focusConfirm: false,
    width: 640,
    didOpen: (popup) => {
      const cards = popup.querySelectorAll('[data-theme-key]')
      cards.forEach((card) => {
        card.addEventListener('click', () => {
          const [themeId, colorMode] = card.dataset.themeKey.split(':')
          manager.setTheme(themeId)
          manager.setColorMode(colorMode)
          SwalLib.close()
        })
      })
    }
  })
}

function renderThemePickerHtml (currentKey) {
  const rows = []
  for (const theme of THEME_SEQUENCE) {
    const cardSet = ['light', 'dark']
      .map((mode) => {
        const key = `${theme}:${mode}`
        const isActive = key === currentKey
        return `
          <button class="theme-card${isActive ? ' theme-card--active' : ''}" data-theme-key="${key}" type="button">
            <div class="theme-card-preview theme-card-preview--${theme} theme-card-preview--${mode}"></div>
            <div class="theme-card-label">
              <strong>${capitalize(theme)}</strong>
              <span>${capitalize(mode)}</span>
            </div>
          </button>
        `
      })
      .join('')
    rows.push(`<div class="theme-card-row">${cardSet}</div>`)
  }
  return `
    <div class="theme-picker">
      <p class="theme-picker-intro">Tap a card to switch both palette and tone.</p>
      ${rows.join('')}
    </div>
  `
}

