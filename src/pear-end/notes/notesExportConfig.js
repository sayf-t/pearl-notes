let cachedPathsPromise = null

function normalizeSlashes (value) {
  return value.replace(/\\/g, '/').replace(/\/+/g, '/')
}

function trimTrailingSlash (value) {
  if (value.length > 1 && value.endsWith('/')) return value.slice(0, -1)
  return value
}

function isAbsolutePath (value) {
  return value.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(value)
}

function expandHome (targetPath) {
  if (!targetPath) return targetPath
  const home = process?.env?.HOME
  if (!home) return targetPath
  if (targetPath === '~') return home
  if (targetPath.startsWith('~/')) return `${trimTrailingSlash(home)}/${targetPath.slice(2)}`
  return targetPath
}

function joinPaths (...segments) {
  return normalizeSlashes(
    segments
      .filter(Boolean)
      .map((segment, index) => {
        const normalized = normalizeSlashes(segment)
        if (index === 0) return normalized
        return normalized.replace(/^\/+/, '')
      })
      .join('/')
  )
}

function resolveFromEnv () {
  const envPath = process?.env?.PEARL_NOTES_EXPORT_DIR
  if (!envPath) return null
  const expanded = expandHome(envPath)
  if (isAbsolutePath(expanded)) return normalizeSlashes(expanded)
  const cwd = process?.cwd?.() || '.'
  return joinPaths(cwd, expanded)
}

function resolveBaseStorageDir () {
  const pearStorage = typeof Pear !== 'undefined' ? Pear?.config?.storage : null
  if (pearStorage) return normalizeSlashes(pearStorage)
  if (process?.env?.PEAR_STORAGE_PATH) {
    return normalizeSlashes(expandHome(process.env.PEAR_STORAGE_PATH))
  }
  const cwd = process?.cwd?.() || '.'
  return normalizeSlashes(cwd)
}

async function computePaths () {
  const configured = resolveFromEnv()
  const baseRoot = configured ?? joinPaths(resolveBaseStorageDir(), 'notes-export')
  const notesRoot = joinPaths(baseRoot, 'notes')
  return { baseRoot, notesRoot }
}

export async function getNotesExportPath () {
  if (!cachedPathsPromise) cachedPathsPromise = computePaths()
  const { baseRoot } = await cachedPathsPromise
  return baseRoot
}

export async function getNotesFilesPath () {
  if (!cachedPathsPromise) cachedPathsPromise = computePaths()
  const { notesRoot } = await cachedPathsPromise
  return notesRoot
}

