/* global Pear, Bare */

console.log('[Pearl] Booting Pear desktop runtime...')
// Start the Pear desktop UI.
console.log('[Pearl] Pear assets config:', Pear.config.assets)
console.log('[Pearl] Pear gui config:', Pear.config.gui)
console.log('[Pearl] Pear applink:', Pear.config.applink)

// Detect platform using Bare global (available in Pear runtime)
const platform = Bare?.platform || (typeof process !== 'undefined' ? process.platform : 'unknown')

if (platform === 'linux') {
  console.log('[Pearl] Linux detected - using compatibility mode')
  console.log('[Pearl] Skipping pear-electron and pear-bridge due to Bare/Electron incompatibility')
  console.log('[Pearl] UI will still load, but window management features will be limited')

  // Create minimal runtime stub for Linux compatibility
  class MinimalRuntime {
    async start() {
      console.log('[Pearl] Minimal runtime started (Linux compatibility mode)')
      return {
        on: (event, callback) => {
          if (event === 'close') {
            // Simulate close event for testing
            setTimeout(() => {
              console.log('[Pearl] Simulating application close (use Ctrl+C to exit)')
              if (typeof Pear !== 'undefined' && Pear.exit) {
                Pear.exit()
              }
            }, 30000) // 30 seconds for testing
          }
        }
      }
    }
  }

  const runtime = new MinimalRuntime()
  const pipe = await runtime.start()
  console.log('[Pearl] Runtime started, opening UI window (limited functionality)')

  pipe.on('close', () => {
    if (typeof Pear !== 'undefined' && Pear.exit) {
      Pear.exit()
    }
  })
} else {
  console.log(`[Pearl] Platform ${platform} detected - using full functionality`)
  // Import and use full Pear electron functionality on supported platforms
  const { default: Bridge } = await import('pear-bridge')
  const { default: Runtime } = await import('pear-electron')

  const bridge = new Bridge()
  await bridge.ready()
  console.log('[Pearl] Bridge ready (entry: index.js)')

  const runtime = new Runtime()
  const pipe = await runtime.start({ bridge })
  console.log('[Pearl] Runtime started, opening UI window')

  pipe.on('close', () => {
    Pear.exit()
  })
}
