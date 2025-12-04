import { ensureDrive as realEnsureDrive } from './hyperdriveClient.js'

let ensureDriveImpl = realEnsureDrive
let localSwitchPromise = Promise.resolve()
let replicationPromise = Promise.resolve()

export function __setEnsureDriveForTests (fn) {
  ensureDriveImpl = typeof fn === 'function' ? fn : realEnsureDrive
  localSwitchPromise = Promise.resolve()
  replicationPromise = Promise.resolve()
}

export async function ensureDrive ({ keyHex } = {}) {
  return ensureDriveImpl({ keyHex })
}

export function forceSwitchDrive (driveKey) {
  if (!driveKey) throw new Error('Drive key required for switch')

  localSwitchPromise = localSwitchPromise
    .catch(() => {})
    .then(() => ensureDriveImpl({ keyHex: driveKey, replicate: false, force: true }))

  return localSwitchPromise
}

export function replicateDrive (driveKey) {
  if (!driveKey) return Promise.resolve()

  replicationPromise = localSwitchPromise
    .catch(() => {})
    .then(() => ensureDriveImpl({ keyHex: driveKey, replicate: true }))
    .catch((err) => {
      console.warn('[Hyperdrive] Background replication failed', err)
    })

  return replicationPromise
}

export function __flushDriveQueuesForTests () {
  return Promise.all([
    localSwitchPromise.catch(() => {}),
    replicationPromise.catch(() => {})
  ])
}

