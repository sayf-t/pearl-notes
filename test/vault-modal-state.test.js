import { test } from 'brittle'
import { needsVaultSwitchConfirmation } from '../src/ui/utils/vaultShareState.js'

test('needsVaultSwitchConfirmation requires second click when switching to different key', (t) => {
  const result = needsVaultSwitchConfirmation({
    currentKey: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    targetKey: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    pendingKey: null
  })

  t.ok(result, 'confirmation required when switching away from current vault')
})

test('needsVaultSwitchConfirmation skips confirmation when target already pending', (t) => {
  const target = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  const result = needsVaultSwitchConfirmation({
    currentKey: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    targetKey: target,
    pendingKey: target
  })

  t.is(result, false, 'second click proceeds without extra confirmation')
})

test('needsVaultSwitchConfirmation skips confirmation when target matches current key', (t) => {
  const key = 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
  const result = needsVaultSwitchConfirmation({
    currentKey: key,
    targetKey: key,
    pendingKey: null
  })

  t.is(result, false, 'no confirmation when already on requested vault')
})

