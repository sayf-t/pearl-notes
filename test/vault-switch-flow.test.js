import { test } from 'brittle'
import {
  applyLinkString,
  getCurrentVaultKeySync,
  __setDriveSwitchersForTests,
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

test('applyLinkString persists key before switching drive', async (t) => {
  resetVaultState()

  const nextKey = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  let persistedBeforeSwitch = null
  let replicateCalledWith = null

  __setDriveSwitchersForTests({
    forceSwitch: async (driveKey) => {
      persistedBeforeSwitch = globalThis.localStorage.getItem(STORAGE_KEY)
      t.is(driveKey, nextKey, 'forceSwitch receives target key')
    },
    replicate: async (driveKey) => {
      replicateCalledWith = driveKey
    }
  })

  t.teardown(() => {
    __setDriveSwitchersForTests()
    delete globalThis.localStorage
  })

  const result = await applyLinkString(`pearl-vault://${nextKey}`)

  t.is(result.driveKey, nextKey, 'applyLinkString returns new key')
  t.is(persistedBeforeSwitch, nextKey, 'key persisted before switching drives')
  t.is(replicateCalledWith, nextKey, 'replication scheduled with new key')
})

test('applyLinkString restores previous key when switch fails', async (t) => {
  const previousKey = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  const nextKey = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  resetVaultState({ [STORAGE_KEY]: previousKey })

  __setDriveSwitchersForTests({
    forceSwitch: async () => {
      throw new Error('switch failed')
    },
    replicate: async () => {
      t.fail('replication should not run when switch fails')
    }
  })

  t.teardown(() => {
    __setDriveSwitchersForTests()
    delete globalThis.localStorage
  })

  await t.exception(
    async () => applyLinkString(`pearl-vault://${nextKey}`),
    /switch failed/,
    'applyLinkString surfaces switch errors'
  )

  t.is(globalThis.localStorage.getItem(STORAGE_KEY), previousKey, 'storage rolls back to previous key')
  t.is(getCurrentVaultKeySync(), previousKey, 'cache rolls back to previous key')
})

