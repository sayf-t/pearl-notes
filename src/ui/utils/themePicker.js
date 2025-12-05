import { showReactModal } from '../modals/showReactModal.js'
import ThemePickerModal from '../components/ThemePickerModal/ThemePickerModal.jsx'

export function openThemePicker (manager, themeState) {
  if (!manager || !themeState) return
  showReactModal(ThemePickerModal, { manager, themeState })
}

