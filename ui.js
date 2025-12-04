import * as PearlCore from './src/core/pearlCore.js'
import { renderPearlApp } from './dist/ui-bundle.js'

const uiLog = (message, level = 'info') => {
  const ts = new Date().toISOString().split('T')[1].slice(0, 8)
  const formatted = `[Pearl UI ${ts}] ${message}`
  const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
  console[method](formatted)
}

await PearlCore.initializeCore()
window.Pearl = PearlCore

renderPearlApp({
  container: document.getElementById('app-root'),
  pearl: PearlCore,
  uiLog
})

