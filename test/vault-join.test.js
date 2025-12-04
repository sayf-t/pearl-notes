import { joinVaultLink } from '../src/core/pearlCore.js'
import { createLinkString } from '../src/pear-end/vault/vaultConfig.js'
import { test } from 'brittle'

test('vault join: returns initiated status immediately', async (t) => {
  const link = createLinkString({ driveKey: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' })
  const result = await joinVaultLink(link)

  t.is(result.status, 'initiated', 'joinVaultLink returns initiated status immediately')
})

test('vault join: invalid link throws error synchronously', async (t) => {
  const invalidLink = 'not-a-valid-link'

  try {
    await joinVaultLink(invalidLink)
    t.fail('should have thrown')
  } catch (err) {
    t.ok(err.message.includes('Invalid link format'), 'throws with appropriate error for invalid link')
  }
})

test('vault join: multiple calls work without hanging', async (t) => {
  const link1 = createLinkString({ driveKey: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' })
  const link2 = createLinkString({ driveKey: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' })

  // First join
  const result1 = await joinVaultLink(link1)
  t.is(result1.status, 'initiated', 'first join returns initiated status')

  // Second join (should not hang)
  const result2 = await joinVaultLink(link2)
  t.is(result2.status, 'initiated', 'second join returns initiated status')

  // Third join (back to first vault)
  const result3 = await joinVaultLink(link1)
  t.is(result3.status, 'initiated', 'third join returns initiated status')
})

test('vault join: timeout protection prevents hanging', async (t) => {
  const link = createLinkString({ driveKey: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' })

  // Start a join operation
  const joinPromise = joinVaultLink(link)

  // Race with a timeout
  const result = await Promise.race([
    joinPromise,
    new Promise(resolve => setTimeout(() => resolve('completed'), 100))
  ])

  t.is(result.status, 'initiated', 'join completes or times out appropriately')
})
