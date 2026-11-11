import assert from 'node:assert/strict'
import { newStoreRow, NEW_STORE_THEME } from './new-store'

// New stores start on the refreshed design. Existing stores are untouched: they have no
// themeId and keep rendering Classic until the owner presses Update.
const row = newStoreRow({ name: 'Munch', slug: 'munch', orgId: 'o1', userId: 'u1', type: 'shop' })
assert.deepEqual(row, {
  name: 'Munch', slug: 'munch', org_id: 'o1', owner_id: 'u1', type: 'shop',
  settings: { themeId: 'classic-2' },
})
assert.equal(NEW_STORE_THEME, 'classic-2')
assert.equal(newStoreRow({ name: 'Hope', slug: 'hope', orgId: 'o1', userId: 'u1', type: 'ngo' }).settings.themeId, 'classic-2', 'NGOs too')

console.log('new-store.test.ts OK')
