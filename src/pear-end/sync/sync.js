import { ensureDrive } from '../vault/hyperdriveClient.js'
import { _setSyncStatus } from '../api.js'

function touchSyncStatus (connected, peers) {
  _setSyncStatus({
    connected,
    peers,
    lastSync: new Date().toISOString()
  })
}

export async function startVaultSync () {
  const { peerCount } = await ensureDrive({ replicate: true })
  touchSyncStatus(true, peerCount)
}

export async function restartVaultSync ({ driveKey } = {}) {
  const { peerCount } = await ensureDrive({ keyHex: driveKey, force: Boolean(driveKey), replicate: true })
  touchSyncStatus(true, peerCount)
}
