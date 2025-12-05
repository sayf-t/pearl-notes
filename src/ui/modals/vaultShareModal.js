import { showReactModal } from './showReactModal.js'
import VaultShareModal from '../components/VaultShareModal/VaultShareModal.jsx'

export function openVaultShareModal (props) {
  return showReactModal(VaultShareModal, props)
}

