import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'

const PREFIX = 'v1'

function keyFromEnv(): Buffer {
  const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
  if (!raw) throw new Error('Missing GOOGLE_TOKEN_ENCRYPTION_KEY')

  if (/^[a-f0-9]{64}$/i.test(raw)) return Buffer.from(raw, 'hex')

  try {
    const decoded = Buffer.from(raw, 'base64')
    if (decoded.length === 32) return decoded
  } catch {
    // Fall through to hash-based normalization.
  }

  return createHash('sha256').update(raw).digest()
}

export function encryptToken(value: string | null | undefined): string | null {
  if (!value) return null
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFromEnv(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    PREFIX,
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

export function decryptToken(value: string | null | undefined): string | null {
  if (!value) return null
  const [prefix, iv64, tag64, encrypted64] = value.split(':')
  if (prefix !== PREFIX || !iv64 || !tag64 || !encrypted64) throw new Error('Invalid encrypted token')
  const decipher = createDecipheriv('aes-256-gcm', keyFromEnv(), Buffer.from(iv64, 'base64'))
  decipher.setAuthTag(Buffer.from(tag64, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
