// Pure rules for connecting a store to the Reach marketplace: store keys and who may be listed.
// No I/O here so both apps (storefront dashboard, web mobile API) share one definition.

/** Unambiguous characters only (no 0/O, 1/I/L) so a key read off a screen can be typed back. */
const KEY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const KEY_GROUPS = 3
const KEY_GROUP_LEN = 4

/** A store may hold this many live keys at once. */
export const MAX_ACTIVE_STORE_KEYS = 10
export const MAX_KEY_LABEL_LENGTH = 40

/**
 * A new store key: `RCH-XXXX-XXXX-XXXX`, 12 characters from a 31-letter alphabet (about 59 bits).
 * The old format was 4 hex + 4 digits (about 29 bits per vendor), which is guessable online.
 * `randomInt` is injected so tests are deterministic; production uses the Web Crypto API.
 */
export function generateStoreKey(randomInt: (max: number) => number = cryptoRandomInt): string {
  const groups: string[] = []
  for (let g = 0; g < KEY_GROUPS; g++) {
    let s = ''
    for (let i = 0; i < KEY_GROUP_LEN; i++) s += KEY_ALPHABET[randomInt(KEY_ALPHABET.length)]
    groups.push(s)
  }
  return `RCH-${groups.join('-')}`
}

function cryptoRandomInt(max: number): number {
  // Rejection sampling keeps the draw uniform (a plain modulo would favour low letters).
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buf)
    if (buf[0] < limit) return buf[0] % max
  }
}

/**
 * What the app sends is trimmed and upper-cased before lookup, so `rch-abcd-...` typed on a phone
 * keyboard still matches. Every stored key is upper-case (old hex keys included).
 */
export function normalizeStoreKey(input: unknown): string {
  return typeof input === 'string' ? input.trim().toUpperCase() : ''
}

export function validateKeyLabel(input: unknown): { ok: true; label: string } | { ok: false; error: string } {
  const label = typeof input === 'string' ? input.trim().replace(/\s+/g, ' ') : ''
  if (!label) return { ok: false, error: 'Give the key a label, like "Counter phone" or "Delivery rider".' }
  if (label.length > MAX_KEY_LABEL_LENGTH) {
    return { ok: false, error: `Keep the label under ${MAX_KEY_LABEL_LENGTH} characters.` }
  }
  return { ok: true, label }
}

/** The Reach marketplace sells goods; donation-style stores (NGOs) have nothing to list. */
export function canListOnReach(store: { type?: string | null; is_active?: boolean | null }): { ok: true } | { ok: false; error: string } {
  if (store.is_active === false) return { ok: false, error: 'Activate your store before listing it on Reach.' }
  if (store.type === 'ngo') return { ok: false, error: 'Reach lists products. Donation sites cannot be listed.' }
  return { ok: true }
}

/** `RCH-ABCD-EFGH-JKMN` -> `RCH-••••-••••-JKMN` for lists where the full key is not needed. */
export function maskStoreKey(key: string): string {
  const parts = key.split('-')
  if (parts.length < 2) return key.length > 4 ? `••••${key.slice(-4)}` : key
  return parts.map((p, i) => (i === 0 || i === parts.length - 1 ? p : '••••')).join('-')
}

/**
 * A Kenyan M-Pesa number as `07XXXXXXXX` / `01XXXXXXXX`, from `+254…`, `254…` or `0…` input; null if it
 * is not one. This is where the admin sends payouts, so a typo here is money sent to a stranger.
 */
export function normalizeKenyanMobile(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const digits = input.replace(/[\s-]/g, '')
  const m = /^(?:\+254|254|0)([71]\d{8})$/.exec(digits)
  return m ? `0${m[1]}` : null
}
