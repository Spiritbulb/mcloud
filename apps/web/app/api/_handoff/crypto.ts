// AES-256-GCM seal/open for the handoff ticket's WorkOS token pair. Mirrors the
// spiritbulb session-crypto approach; encrypts at rest so a DB read alone does
// not yield usable credentials. Node webcrypto, no dependency.
import { webcrypto as crypto } from 'node:crypto'

export type HandoffTokens = { accessToken: string; refreshToken: string }

function b64urlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url')
}
function b64urlDecode(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, 'base64url'))
}

async function importKey(): Promise<CryptoKey> {
  const raw = process.env.HANDOFF_ENC_KEY
  if (!raw) throw new Error('HANDOFF_ENC_KEY is not set')
  const keyBytes = new Uint8Array(Buffer.from(raw, 'base64'))
  if (keyBytes.byteLength !== 32) throw new Error('HANDOFF_ENC_KEY must be 32 bytes (base64)')
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function sealTokens(t: HandoffTokens): Promise<string> {
  const key = await importKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const pt = new TextEncoder().encode(JSON.stringify(t))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pt))
  return `${b64urlEncode(iv)}.${b64urlEncode(ct)}`
}

export async function openTokens(sealed: string): Promise<HandoffTokens | null> {
  const key = await importKey()
  try {
    const [ivPart, ctPart] = sealed.split('.')
    if (!ivPart || !ctPart) return null
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64urlDecode(ivPart) },
      key,
      b64urlDecode(ctPart),
    )
    return JSON.parse(new TextDecoder().decode(pt)) as HandoffTokens
  } catch {
    return null
  }
}
