/* global Pear */
import Runtime from 'pear-electron'
import Bridge from 'pear-bridge'
console.log('[Pearl] Booting Pear desktop runtime...')
// Start the Pear desktop UI.
console.log('[Pearl] Pear assets config:', Pear.config.assets)
console.log('[Pearl] Pear gui config:', Pear.config.gui)
console.log('[Pearl] Pear applink:', Pear.config.applink)
const bridge = new Bridge()
await bridge.ready()
console.log('[Pearl] Bridge ready (entry: index.js)')

const runtime = new Runtime()
const pipe = await runtime.start({ bridge })
console.log('[Pearl] Runtime started, opening UI window')

pipe.on('close', () => {
  Pear.exit()
})

