import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'

const pearGlobal = typeof Pear !== 'undefined' ? Pear : null

let storePromise = null
let drivePromise = null
let swarm = null
let discovery = null
let currentDriveKeyHex = null
let currentDiscoveryKeyHex = null
let peerCount = 0

const DISCOVERY_FLUSH_TIMEOUT_MS = 5000 // 5 seconds

function resolveStoragePath () {
  if (pearGlobal?.config?.storage) return pearGlobal.config.storage
  if (typeof process !== 'undefined' && process?.env?.PEAR_STORAGE_PATH) {
    return process.env.PEAR_STORAGE_PATH
  }
  return '.'
}

async function createStore () {
  const store = new Corestore(resolveStoragePath())
  if (typeof store.ready === 'function') {
    await store.ready()
  }
  return store
}

async function ensureStore () {
  storePromise = storePromise ?? createStore()
  return storePromise
}

async function ensureReplication (store, drive) {
  if (!swarm) {
    swarm = new Hyperswarm()
    swarm.on('connection', (conn) => {
      store.replicate(conn)
      peerCount++
      conn.once('close', () => {
        peerCount = Math.max(0, peerCount - 1)
      })
    })
    if (pearGlobal?.teardown) {
      pearGlobal.teardown(() => {
        swarm?.destroy()
        swarm = null
        discovery = null
      })
    }
  }

  const nextDiscoveryHex = b4a.toString(drive.discoveryKey, 'hex')
  if (currentDiscoveryKeyHex !== nextDiscoveryHex) {
    if (discovery?.destroy) {
      try {
        discovery.destroy()
      } catch {}
    }
    discovery = swarm.join(drive.discoveryKey, { announce: true, lookup: true })
    if (typeof discovery.flushed === 'function') {
      await Promise.race([
        discovery.flushed(),
        new Promise(resolve => setTimeout(resolve, DISCOVERY_FLUSH_TIMEOUT_MS))
      ])
    } else if (typeof swarm.flush === 'function') {
      await Promise.race([
        swarm.flush(),
        new Promise(resolve => setTimeout(resolve, DISCOVERY_FLUSH_TIMEOUT_MS))
      ])
    }
    currentDiscoveryKeyHex = nextDiscoveryHex
  }
}

export async function ensureDrive ({ keyHex, force = false, replicate = true } = {}) {
  const store = await ensureStore()
  const needsNewDrive = force || !drivePromise || (keyHex && keyHex !== currentDriveKeyHex)

  if (needsNewDrive) {
    drivePromise = (async () => {
      const keyBuffer = keyHex ? b4a.from(keyHex, 'hex') : undefined
      const drive = new Hyperdrive(store, keyBuffer)
      await drive.ready()
      currentDriveKeyHex = b4a.toString(drive.key, 'hex')
      return drive
    })()
    currentDiscoveryKeyHex = null
  }

  const drive = await drivePromise
  if (replicate) {
    await ensureReplication(store, drive)
    // For new drives, indicate we're finding peers and wait for initial discovery
    if (needsNewDrive) {
      console.log('[Hyperdrive] New drive created, waiting for peer discovery...')
      const done = drive.findingPeers()
      try {
        // Wait for swarm discovery to complete or timeout
        await Promise.race([
          swarm?.flush() || Promise.resolve(),
          new Promise(resolve => setTimeout(resolve, DISCOVERY_FLUSH_TIMEOUT_MS))
        ])
      } catch (err) {
        console.warn('[Hyperdrive] Peer discovery timeout:', err)
      } finally {
        done() // Signal that peer finding is complete
        console.log('[Hyperdrive] Peer finding complete')
      }
    }

    // Ensure drive is fully synchronized after replication setup
    console.log('[Hyperdrive] Ensuring drive is synchronized...')
    try {
      await Promise.race([
        drive.update({ wait: true }),
        new Promise(resolve => setTimeout(resolve, 10000)) // 10 second timeout
      ])
      console.log('[Hyperdrive] Drive synchronization complete')
    } catch (err) {
      console.warn('[Hyperdrive] Drive synchronization timeout or error:', err)
      // Continue anyway - drive might still work
    }
  }
  return { drive, keyHex: currentDriveKeyHex, peerCount }
}

export async function switchDrive (keyHex) {
  if (!keyHex) throw new Error('Drive key required')
  return ensureDrive({ keyHex, force: true })
}

export function getCurrentDriveKey () {
  return currentDriveKeyHex
}

export function getPeerCount () {
  return peerCount
}

