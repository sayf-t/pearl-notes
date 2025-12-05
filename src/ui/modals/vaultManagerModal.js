import { showReactModal } from './showReactModal.js'
import VaultManagerModal from '../components/VaultManagerModal/VaultManagerModal.jsx'
import { openVaultShareModal } from './vaultShareModal.js'

export function openVaultManagerModal (props) {
  if (typeof window === 'undefined') return null
  let controller = null
  const handleShare = () => {
    controller?.close()
    setTimeout(() => openVaultShareModal(props), 0)
  }

  controller = showReactModal(VaultManagerModal, {
    ...props,
    onShare: handleShare
  })

  return controller
}

