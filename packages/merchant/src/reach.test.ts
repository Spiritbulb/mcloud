import assert from 'node:assert/strict'
import { canListOnReach, generateStoreKey, maskStoreKey, normalizeStoreKey, validateKeyLabel } from './reach'

// Format: RCH-XXXX-XXXX-XXXX from the unambiguous alphabet.
const key = generateStoreKey()
assert.match(key, /^RCH-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/)
assert.equal(new Set(Array.from({ length: 200 }, () => generateStoreKey())).size, 200, 'keys do not repeat')

// The injected RNG is honoured (first letter of the alphabet, then the last).
assert.equal(generateStoreKey(() => 0), 'RCH-AAAA-AAAA-AAAA')
assert.equal(generateStoreKey((max) => max - 1), 'RCH-9999-9999-9999')

// Every letter of the alphabet can appear, i.e. the draw is not truncated.
const seen = new Set<string>()
for (let i = 0; i < 400; i++) for (const ch of generateStoreKey().replace(/-/g, '').slice(3)) seen.add(ch)
assert.equal(seen.size, 31)

assert.equal(normalizeStoreKey('  rch-abcd-efgh-jkmn \n'), 'RCH-ABCD-EFGH-JKMN')
assert.equal(normalizeStoreKey('e874-0421'), 'E874-0421') // legacy format still resolves
assert.equal(normalizeStoreKey(undefined), '')
assert.equal(normalizeStoreKey(42), '')

assert.deepEqual(validateKeyLabel('  Counter   phone '), { ok: true, label: 'Counter phone' })
assert.equal(validateKeyLabel('').ok, false)
assert.equal(validateKeyLabel('   ').ok, false)
assert.equal(validateKeyLabel(null).ok, false)
assert.equal(validateKeyLabel('x'.repeat(41)).ok, false)
assert.equal(validateKeyLabel('x'.repeat(40)).ok, true)

assert.equal(canListOnReach({ type: 'shop', is_active: true }).ok, true)
assert.equal(canListOnReach({ type: 'shop' }).ok, true)
assert.equal(canListOnReach({ type: 'ngo', is_active: true }).ok, false)
assert.equal(canListOnReach({ type: 'shop', is_active: false }).ok, false)

assert.equal(maskStoreKey('RCH-ABCD-EFGH-JKMN'), 'RCH-••••-••••-JKMN')
assert.equal(maskStoreKey('E874-0421'), 'E874-0421')

console.log('reach key logic ok')
