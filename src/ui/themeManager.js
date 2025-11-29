const THEME_SEQUENCE = ['neon', 'minimal', 'cupertino', 'pink', 'purple']
const FONT_STYLES = ['system', 'serif', 'mono']

export function createThemeManager (logger = () => {}) {
  const THEME_STORAGE_KEY = 'pearl.themePreferences'
  const FONT_STORAGE_KEY = 'pearl.fontStyle'
  const prefersDark = Boolean(window?.matchMedia?.('(prefers-color-scheme: dark)').matches)
  const defaultTheme = prefersDark ? 'neon' : 'minimal'
  const defaultPerThemeModes = {
    neon: 'dark',
    minimal: prefersDark ? 'dark' : 'light',
    cupertino: prefersDark ? 'dark' : 'light',
    pink: prefersDark ? 'dark' : 'light',
    purple: prefersDark ? 'dark' : 'light'
  }

  const state = {
    themeId: defaultTheme,
    colorMode: defaultPerThemeModes[defaultTheme],
    fontStyle: 'system',
    perThemeModes: { ...defaultPerThemeModes }
  }

  const subscribers = new Set()
  const root = document?.documentElement

  function notify () {
    const snapshot = { ...state }
    subscribers.forEach((listener) => listener(snapshot))
  }

  function safeRead (key) {
    try {
      return window.localStorage?.getItem(key) ?? null
    } catch (err) {
      logger(`Storage read failed: ${err.message}`, 'warn')
      return null
    }
  }

  function safeWrite (key, value) {
    try {
      window.localStorage?.setItem(key, value)
    } catch (err) {
      logger(`Storage write failed: ${err.message}`, 'warn')
    }
  }

  function hydrateFromStorage () {
    const rawPrefs = safeRead(THEME_STORAGE_KEY)
    if (rawPrefs) {
      try {
        const parsed = JSON.parse(rawPrefs)
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.perThemeModes === 'object') {
            state.perThemeModes = { ...state.perThemeModes, ...parsed.perThemeModes }
          }
          if (typeof parsed.themeId === 'string' && THEME_SEQUENCE.includes(parsed.themeId)) {
            state.themeId = parsed.themeId
          }
          if (parsed.colorMode === 'light' || parsed.colorMode === 'dark') {
            state.colorMode = parsed.colorMode
          }
        }
      } catch (err) {
        logger(`Theme prefs parse failed: ${err.message}`, 'warn')
      }
    }
    if (!state.perThemeModes[state.themeId]) {
      state.perThemeModes[state.themeId] = state.colorMode
    }
    state.colorMode = state.perThemeModes[state.themeId]

    const storedFont = safeRead(FONT_STORAGE_KEY)
    if (storedFont && FONT_STYLES.includes(storedFont)) {
      state.fontStyle = storedFont
    }
  }

  function persistThemePrefs () {
    const payload = JSON.stringify({
      themeId: state.themeId,
      colorMode: state.colorMode,
      perThemeModes: state.perThemeModes
    })
    safeWrite(THEME_STORAGE_KEY, payload)
  }

  function persistFontStyle () {
    safeWrite(FONT_STORAGE_KEY, state.fontStyle)
  }

  function applyToDocument () {
    if (!root) return
    root.dataset.theme = state.themeId
    root.dataset.colorMode = state.colorMode
    root.dataset.fontStyle = state.fontStyle
    notify()
  }

  function init () {
    hydrateFromStorage()
    applyToDocument()
  }

  function setTheme (themeId) {
    if (!THEME_SEQUENCE.includes(themeId)) return
    state.themeId = themeId
    state.colorMode = state.perThemeModes[themeId] || state.colorMode || 'light'
    applyToDocument()
    persistThemePrefs()
    logger(`Theme set to ${themeId} (${state.colorMode})`)
  }

  function setColorMode (mode) {
    if (mode !== 'light' && mode !== 'dark') return
    state.colorMode = mode
    state.perThemeModes[state.themeId] = mode
    applyToDocument()
    persistThemePrefs()
    logger(`Color mode set to ${mode}`)
  }

  function setFontStyle (style) {
    if (!FONT_STYLES.includes(style)) return
    state.fontStyle = style
    applyToDocument()
    persistFontStyle()
    logger(`Font style set to ${style}`)
  }

  function subscribe (listener) {
    subscribers.add(listener)
    listener({ ...state })
    return () => subscribers.delete(listener)
  }

  function getState () {
    return { ...state }
  }

  return {
    init,
    setTheme,
    setColorMode,
    setFontStyle,
    subscribe,
    getState
  }
}

