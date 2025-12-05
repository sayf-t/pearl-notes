import { ensureDrive as realEnsureDrive } from './hyperdriveClient.js'

let ensureDriveImpl = realEnsureDrive
let localSwitchPromise = Promise.resolve()
let replicationPromise = Promise.resolve()
let driveOperationState = {
  type: 'idle',
  startedAt: 0,
  promise: Promise.resolve()
}

function trackOperation (type, promise) {
  const tracked = promise.finally(() => {
    if (driveOperationState.promise === tracked) {
      driveOperationState = {
        type: 'idle',
        startedAt: 0,
        promise: Promise.resolve()
      }
    }
  })

  driveOperationState = {
    type,
    startedAt: Date.now(),
    promise: tracked
  }

  return tracked
}

export function getDriveOperationState () {
  return {
    type: driveOperationState.type,
    busy: driveOperationState.type !== 'idle',
    startedAt: driveOperationState.startedAt
  }
}

export function __setEnsureDriveForTests (fn) {
  ensureDriveImpl = typeof fn === 'function' ? fn : realEnsureDrive
  localSwitchPromise = Promise.resolve()
  replicationPromise = Promise.resolve()
  driveOperationState = {
    type: 'idle',
    startedAt: 0,
    promise: Promise.resolve()
  }
}

export async function ensureDrive ({ keyHex } = {}) {
  await localSwitchPromise.catch(() => {})
  const ensurePromise = ensureDriveImpl({ keyHex })
  return trackOperation('ensure', ensurePromise)
}

export function forceSwitchDrive (driveKey) {
  if (!driveKey) throw new Error('Drive key required for switch')

  const nextSwitch = localSwitchPromise
    .catch(() => {})
    .then(() => ensureDriveImpl({ keyHex: driveKey, replicate: false, force: true }))

  localSwitchPromise = trackOperation('switch', nextSwitch)

  return localSwitchPromise
}

export function replicateDrive (driveKey) {
  if (!driveKey) return Promise.resolve()

  const nextReplication = localSwitchPromise
    .catch(() => {})
    .then(() => ensureDriveImpl({ keyHex: driveKey, replicate: true }))
    .catch((err) => {
      console.warn('[Hyperdrive] Background replication failed', err)
      return null
    })

  replicationPromise = trackOperation('replicate', nextReplication)

  return replicationPromise
}

export function __flushDriveQueuesForTests () {
  return Promise.all([
    localSwitchPromise.catch(() => {}),
    replicationPromise.catch(() => {})
  ])
}

