import test from 'brittle'

import {
  ensureVaultConfig,
  createLinkString,
  parseLinkString,
  applyLinkString,
  __setEnsureDriveForTests,
  __flushDriveSetupQueueForTests
} from '../src/pear-end/vault/vaultConfig.js'

async function withFakeLocalStorage (fn) {
  const original = globalThis.localStorage
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  }
  try {
    return await fn(store)
  } finally {
    globalThis.localStorage = original
  }
}

test('vaultConfig: createLinkString requires driveKey and prefixes scheme', (t) => {
  const driveKey = 'a'.repeat(64)
  const link = createLinkString({ driveKey })

  t.is(link, `pearl-vault://${driveKey}`)

  t.exception(
    () => createLinkString({ driveKey: '' }),
    /Missing drive key/,
    'empty driveKey should throw'
  )
})

test('vaultConfig: parseLinkString handles valid and invalid inputs', (t) => {
  const key = 'b'.repeat(64)
  const valid = `pearl-vault://${key}`
  const withQuery = `pearl-vault://${key}?secret=ignored`

  const parsed = parseLinkString(valid)
  t.alike(parsed, { driveKey: key })

  const parsedQuery = parseLinkString(withQuery)
  t.alike(parsedQuery, { driveKey: key })

  const emptyResult = parseLinkString('')
  t.ok(emptyResult.error, 'empty string returns error')
  t.ok(emptyResult.error.includes('empty'), 'error message mentions empty')

  const wrongSchemeResult = parseLinkString('http://example.com')
  t.ok(wrongSchemeResult.error, 'wrong scheme returns error')
  t.ok(wrongSchemeResult.error.includes('pearl-vault://'), 'error message mentions expected format')

  const shortKeyResult = parseLinkString('pearl-vault://short')
  t.ok(shortKeyResult.error, 'invalid key returns error')
  t.ok(shortKeyResult.error.includes('64'), 'error message mentions expected length')
})

test('vaultConfig: applyLinkString validates and calls ensureDrive', async (t) => {
  const key = 'c'.repeat(64)
  const link = `pearl-vault://${key}`
  const calls = []

  __setEnsureDriveForTests(async (opts) => {
    calls.push(opts)
    return { keyHex: opts.keyHex }
  })

  try {
    await withFakeLocalStorage(async (store) => {
      const result = await applyLinkString(link)
      t.alike(result, { driveKey: key })

      await __flushDriveSetupQueueForTests()

      t.is(calls.length, 2)
      t.alike(calls[0], { keyHex: key, replicate: false, force: true })
      t.alike(calls[1], { keyHex: key, replicate: true })

      t.is(store.get('pearl-drive-key'), key)
    })

    await t.exception(
      () => applyLinkString('pearl-vault://invalid-key'),
      /Invalid drive key format/,
      'invalid link should throw with descriptive error'
    )
  } finally {
    __setEnsureDriveForTests(null)
  }
})

test('vaultConfig: ensureVaultConfig reads and persists drive key via ensureDrive', async (t) => {
  const key = 'd'.repeat(64)
  const calls = []

  __setEnsureDriveForTests(async (opts) => {
    calls.push(opts)
    // echo back any provided keyHex to simulate idempotent ensureDrive
    return { keyHex: opts.keyHex || key }
  })

  try {
    await withFakeLocalStorage(async (store) => {
      const cfg = await ensureVaultConfig()
      t.alike(cfg, { driveKey: key })

      t.is(calls.length, 1)
      t.alike(calls[0], { keyHex: undefined })

      t.is(store.get('pearl-drive-key'), key)

      const cfg2 = await ensureVaultConfig()
      t.alike(cfg2, { driveKey: key })
      t.is(calls.length, 2)
      t.alike(calls[1], { keyHex: key })
    })
  } finally {
    __setEnsureDriveForTests(null)
  }
})


