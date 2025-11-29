import Localdrive from 'localdrive'
import { getNotesExportPath } from './notesExportConfig.js'

const NOTES_PREFIX = '/notes'

let localDrivePromise = null
let mirrorPromise = null
let rerunRequested = false
let lastDrive = null

function logWarning (message, err) {
  const suffix = err ? `: ${err.message || err}` : ''
  console.warn(`[notesMirror] ${message}${suffix}`)
}

async function getLocalDrive () {
  if (!localDrivePromise) {
    localDrivePromise = (async () => {
      const exportRoot = await getNotesExportPath()
      // Localdrive will create any needed directories lazily.
      return new Localdrive(exportRoot)
    })()
  }
  return localDrivePromise
}

async function runMirror (drive) {
  try {
    const localDrive = await getLocalDrive()
    const mirror = drive.mirror(localDrive, { prefix: NOTES_PREFIX, prune: true })
    await mirror.done()
  } catch (err) {
    logWarning('Failed to mirror notes drive', err)
  }
}

export function queueMirror (drive) {
  if (!drive) return Promise.resolve()
  lastDrive = drive
  if (mirrorPromise) {
    rerunRequested = true
    return mirrorPromise
  }
  rerunRequested = false
  mirrorPromise = (async () => {
    do {
      rerunRequested = false
      await runMirror(lastDrive)
    } while (rerunRequested)
  })()
  mirrorPromise = mirrorPromise
    .catch((err) => {
      logWarning('Mirror queue failed', err)
    })
    .finally(() => {
      mirrorPromise = null
    })
  return mirrorPromise
}

export function exportAllNotesToDisk (drive = lastDrive) {
  if (!drive) return Promise.resolve()
  return queueMirror(drive)
}

