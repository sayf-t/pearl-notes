import esbuild from 'esbuild'
import cssModulesPlugin from 'esbuild-css-modules-plugin'
import { copyFile } from 'node:fs/promises'

const watch = process.argv.includes('--watch')

const commonConfig = {
  entryPoints: ['src/ui/index.jsx'],
  // Keep build artifacts out of the project root
  outfile: 'dist/ui-bundle.js',
  bundle: true,
  sourcemap: true,
  format: 'esm',
  platform: 'browser',  // Target browser (Electron renderer); handles polyfills
  target: ['es2020'],
  loader: {
    '.js': 'jsx'
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  minify: !watch,
  logLevel: 'info',
  alias: {
    'sodium-native': 'sodium-javascript'  // Use JS fallback instead of native
  },
  external: ['pear-electron'],  // pear-electron is available at runtime in Electron renderer
  plugins: [
    cssModulesPlugin({
      // keep class names readable for easier debugging
      localsConvention: 'camelCaseOnly'
    })
  ]
}

async function copyAssets() {
  try {
    await copyFile('node_modules/sweetalert2/dist/sweetalert2.all.min.js', 'dist/sweetalert2.all.min.js')
  } catch (err) {
    console.error('Failed to copy assets:', err)
  }
}

if (watch) {
  const ctx = await esbuild.context({
    ...commonConfig,
    plugins: [
      ...commonConfig.plugins,
      {
        name: 'copy-assets',
        setup(build) {
          build.onEnd(copyAssets)
        }
      }
    ]
  })
  await copyAssets() // Initial copy
  await ctx.watch()
  console.log('[ui-build] watching for changes...')
} else {
  await esbuild.build(commonConfig)
  await copyAssets()
  console.log('[ui-build] bundle created.')
}