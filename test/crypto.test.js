import test from 'brittle'

import {
  randomBytes,
  randomId,
  randomSecret,
  hashParts,
  hashHex
} from '../src/pear-end/vault/crypto.js'

test('crypto: randomBytes returns a buffer of requested size', (t) => {
  const buf = randomBytes(16)
  t.ok(Buffer.isBuffer(buf) || buf?.byteLength != null, 'randomBytes result is buffer-like')
  t.is(buf.length, 16)
})

test('crypto: randomId produces hex of expected length and variability', (t) => {
  const id1 = randomId()
  const id2 = randomId()

  t.is(id1.length, 32)
  t.is(id2.length, 32)
  t.not(id1, id2, 'subsequent randomIds should differ')
  t.ok(/^[0-9a-f]+$/.test(id1), 'randomId should be lowercase hex')
})

test('crypto: randomSecret produces base64-like secret of non-zero length', (t) => {
  const secret = randomSecret()
  t.ok(secret.length > 0, 'secret should not be empty')
  t.ok(/^[0-9A-Za-z+/=]+$/.test(secret), 'secret should look like base64')
})

test('crypto: hashParts is deterministic for same inputs', (t) => {
  const a1 = hashParts('hello', 42, true)
  const a2 = hashParts('hello', 42, true)
  const b = hashParts('hello', 43, true)

  t.alike(a1, a2, 'same inputs yield identical hash buffer')
  t.not(a1.toString('hex'), b.toString('hex'), 'different inputs yield different hex')
})

test('crypto: hashHex wraps hashParts and returns hex string', (t) => {
  const h1 = hashHex('abc')
  const h2 = hashHex('abc')
  const h3 = hashHex('abcd')

  t.is(typeof h1, 'string')
  t.is(h1.length, h2.length)
  t.is(h1, h2, 'same inputs yield same hex string')
  t.not(h1, h3, 'different inputs yield different hex string')
  t.ok(/^[0-9a-f]+$/.test(h1), 'hashHex should be lowercase hex')
})


