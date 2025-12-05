import { test } from 'brittle'
import {
  getPersistedVaultKey,
  getCurrentVaultKeySync,
  ensureVaultConfig,
  parseLinkString,
  __setEnsureDriveForTests,
  __resetVaultKeyCacheForTests
} from '../src/pear-end/vault/vaultConfig.js'

const STORAGE_KEY = 'pearl-drive-key'

function initTestStorage (initial = {}) {
  const store = { ...initial }
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value)
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key])
    }
  }
  return store
}

function resetVaultState (initialStore = {}) {
  const store = initTestStorage(initialStore)
  __resetVaultKeyCacheForTests()
  return store
}

test('getPersistedVaultKey normalizes stored value', (t) => {
  const uppercaseKey = 'ABCDEF123456ABCDEF123456ABCDEF123456ABCDEF123456ABCDEF123456ABCD'
  resetVaultState({ [STORAGE_KEY]: uppercaseKey })

  const normalized = getPersistedVaultKey()
  t.is(normalized, uppercaseKey.toLowerCase(), 'stored key is normalized to lowercase')

  delete globalThis.localStorage
})

test('getCurrentVaultKeySync caches first read until reset', (t) => {
  const keyOne = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  const keyTwo = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  const store = resetVaultState({ [STORAGE_KEY]: keyOne })

  t.is(getCurrentVaultKeySync(), keyOne, 'first read returns stored key')

  store[STORAGE_KEY] = keyTwo
  t.is(getCurrentVaultKeySync(), keyOne, 'cached value ignores external changes')

  __resetVaultKeyCacheForTests()
  t.is(getCurrentVaultKeySync(), keyTwo, 'cache reset picks up new value')

  delete globalThis.localStorage
})

test('ensureVaultConfig persists key returned by ensureDrive', async (t) => {
  resetVaultState()

  const generatedKey = 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
  let receivedKeyHex = null

  __setEnsureDriveForTests(async ({ keyHex }) => {
    receivedKeyHex = keyHex || null
    return { keyHex: generatedKey }
  })

  t.teardown(() => {
    __setEnsureDriveForTests()
    delete globalThis.localStorage
  })

  const result = await ensureVaultConfig()

  t.is(receivedKeyHex, null, 'ensureDrive called without seed key when none stored')
  t.is(result.driveKey, generatedKey, 'ensureVaultConfig returns generated key')
  t.is(getCurrentVaultKeySync(), generatedKey, 'cache updated with generated key')
  t.is(globalThis.localStorage.getItem(STORAGE_KEY), generatedKey, 'key persisted to storage')
})

test('ensureVaultConfig reuses cached key when available', async (t) => {
  const existingKey = 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'
  resetVaultState({ [STORAGE_KEY]: existingKey })

  let receivedKeyHex = null
  __setEnsureDriveForTests(async ({ keyHex }) => {
    receivedKeyHex = keyHex
    return { keyHex: keyHex }
  })

  t.teardown(() => {
    __setEnsureDriveForTests()
    delete globalThis.localStorage
  })

  const result = await ensureVaultConfig()

  t.is(receivedKeyHex, existingKey, 'ensureDrive seeded with cached key')
  t.is(result.driveKey, existingKey, 'drive key remains unchanged')
  t.is(getCurrentVaultKeySync(), existingKey, 'cache still uses same key')
})

test('parseLinkString validates scheme and drive key length', (t) => {
  const missingScheme = parseLinkString('vault://1234')
  t.ok(missingScheme.error?.includes('Invalid link format'), 'missing scheme produces error')

  const missingKey = parseLinkString('pearl-vault://')
  t.ok(missingKey.error?.includes('missing the drive key'), 'missing key produces descriptive error')
})

test('parseLinkString accepts uppercase keys and ignores query params', (t) => {
  const key = 'ABCDEF123456ABCDEF123456ABCDEF123456ABCDEF123456ABCDEF123456ABCD'
  const result = parseLinkString(`pearl-vault://${key}?secret=ignored`)

  t.is(result.error, undefined, 'valid link has no error')
  t.is(result.driveKey, key.toLowerCase(), 'drive key is normalized to lowercase')
})

