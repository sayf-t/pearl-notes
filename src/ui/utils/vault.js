export function formatVaultStatus (status) {
  if (!status) return 'Vault key: (loading...)'
  const { driveKey, connected, peersCount, lastSyncAt, writable } = status
  const keyDisplay = driveKey ? `${driveKey.slice(0, 12)}…` : '(allocating...)'
  const parts = [`Vault key: ${keyDisplay}`, connected ? 'Sync: active' : 'Sync: offline']
  parts.push(`Peers: ${peersCount ?? 0}`)
  if (typeof writable === 'boolean') {
    parts.push(`Access: ${writable ? 'write' : 'read-only'}`)
  }
  if (lastSyncAt) parts.push(`Last sync: ${new Date(lastSyncAt).toLocaleTimeString()}`)
  return parts.join(' · ')
}

export { openVaultShareModal } from '../modals/vaultShareModal.js'
export { openVaultManagerModal } from '../modals/vaultManagerModal.js'
