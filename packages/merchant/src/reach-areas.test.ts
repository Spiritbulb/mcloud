import assert from 'node:assert/strict'
import { areaLabel, nearestArea, relatedAreaIds, slugifyArea, validateAreaInput, vendorServesArea, type Area } from './reach-areas'

const a = (id: string, name: string, parent: string | null, lat: number | null = null, lng: number | null = null): Area => ({
  id, name, slug: id, parent_id: parent, lat, lng,
})
const areas = [
  a('nbi', 'Nairobi', null, -1.2921, 36.8219),
  a('wl', 'Westlands', 'nbi', -1.2676, 36.8108),
  a('kl', 'Kilimani', 'nbi', -1.2905, 36.7870),
  a('nku', 'Nakuru', null, -0.3031, 36.08),
  a('ms', 'Milimani', 'nku'),
]

// A buyer in Westlands relates to Westlands, Nairobi (parent) and nothing in Kilimani / Nakuru.
assert.deepEqual([...relatedAreaIds(areas, 'wl')].sort(), ['nbi', 'wl'])
// A buyer who picked the town relates to every area inside it.
assert.deepEqual([...relatedAreaIds(areas, 'nbi')].sort(), ['kl', 'nbi', 'wl'])
assert.equal(relatedAreaIds(areas, 'nope').size, 0)

// Serving a town covers its areas; serving an area covers a buyer who picked just the town.
assert.equal(vendorServesArea(areas, ['nbi'], 'wl'), true)
assert.equal(vendorServesArea(areas, ['wl'], 'nbi'), true)
assert.equal(vendorServesArea(areas, ['wl'], 'wl'), true)
assert.equal(vendorServesArea(areas, ['kl', 'wl'], 'wl'), true) // home + extra delivery area
// Siblings do not serve each other (a Kilimani-only vendor does not deliver to Westlands).
assert.equal(vendorServesArea(areas, ['kl'], 'wl'), false)
assert.equal(vendorServesArea(areas, ['nku'], 'wl'), false)
assert.equal(vendorServesArea(areas, [], 'wl'), false)

// A parent cycle in bad data must not loop forever.
const cyc = [a('x', 'X', 'y'), a('y', 'Y', 'x')]
assert.ok(relatedAreaIds(cyc, 'x').size >= 1)

assert.equal(areaLabel(areas, 'wl'), 'Westlands, Nairobi')
assert.equal(areaLabel(areas, 'nbi'), 'Nairobi')
assert.equal(areaLabel(areas, null), '')

// GPS: a fix in Westlands picks Westlands, not the town centre; far away suggests nothing.
assert.equal(nearestArea(areas, -1.268, 36.811)?.id, 'wl')
assert.equal(nearestArea(areas, -1.3, 36.82)?.id, 'nbi')
assert.equal(nearestArea(areas, 3.1, 40.0), null) // far north-east
assert.equal(nearestArea([a('t', 'No coords', null)], -1, 36), null)
assert.equal(nearestArea([{ ...a('o', 'Off', null, -1.29, 36.82), active: false }], -1.29, 36.82), null)

assert.equal(slugifyArea('  Kilimani Estate!! '), 'kilimani-estate')
assert.equal(slugifyArea('Ngong Rd. / Karen'), 'ngong-rd-karen')
assert.equal(validateAreaInput({ name: 'K' }).ok, false)
assert.deepEqual(validateAreaInput({ name: 'Karen', lat: '-1.3', lng: 36.7 }), { ok: true, name: 'Karen', slug: 'karen', lat: -1.3, lng: 36.7 })
assert.equal(validateAreaInput({ name: 'Karen', lat: -1.3 }).ok, false)
assert.equal(validateAreaInput({ name: 'Karen', lat: 91, lng: 0 }).ok, false)
assert.equal(validateAreaInput({ name: 'Karen' }).ok, true)

console.log('reach areas ok')
