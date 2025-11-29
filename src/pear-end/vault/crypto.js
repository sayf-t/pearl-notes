import b4a from 'b4a'
import hypercoreCrypto from 'hypercore-crypto'

function normalizePart (value) {
  if (value == null) return b4a.from('')
  if (typeof value === 'string') return b4a.from(value)
  if (typeof value === 'number' || typeof value === 'boolean') return b4a.from(String(value))
  if (b4a.isBuffer(value)) return value
  if (ArrayBuffer.isView(value)) return b4a.from(value)
  if (value instanceof ArrayBuffer) return b4a.from(new Uint8Array(value))
  return b4a.from(String(value))
}

export function randomBytes (size = 32) {
  return hypercoreCrypto.randomBytes(size)
}

export function randomId (size = 16) {
  return b4a.toString(randomBytes(size), 'hex')
}

export function randomSecret (size = 32) {
  return b4a.toString(randomBytes(size), 'base64')
}

export function hashParts (...parts) {
  const buffers = parts.map(normalizePart)
  return hypercoreCrypto.hash(buffers)
}

export function hashHex (...parts) {
  return b4a.toString(hashParts(...parts), 'hex')
}

