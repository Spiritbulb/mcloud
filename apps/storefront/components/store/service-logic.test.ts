import { test } from 'node:test'
import assert from 'node:assert/strict'
import { draftFromService, draftProblem, emptyDraft, emptyPackage, servicePayload, slugify, startingPrice } from './service-logic.ts'

const base = { ...emptyDraft(), name: 'Logo design', basePrice: '5000' }

test('new packages get distinct, non-empty ids', () => {
    const a = emptyPackage()
    const b = emptyPackage()
    assert.ok(a.id && b.id)
    assert.notEqual(a.id, b.id)
})

test('the starting price is the cheapest package, else the base price', () => {
    assert.equal(startingPrice(base), 5000)
    assert.equal(startingPrice({ ...base, packages: [{ ...emptyPackage(), price: '900' }, { ...emptyPackage(), price: '300' }] }), 300)
})

test('problems are reported in order', () => {
    assert.equal(draftProblem({ ...base, name: ' ' }), 'Give the service a name.')
    assert.equal(draftProblem({ ...base, basePrice: '' }), 'Enter a price, or add at least one package.')
    assert.equal(draftProblem({ ...base, packages: [{ ...emptyPackage(), price: '' }] }), 'Package 1 needs a price.')
    assert.equal(draftProblem({ ...base, minQuantity: '5', maxQuantity: '2' }), 'The minimum quantity is larger than the maximum.')
    assert.equal(draftProblem({ ...base, requiresDeposit: true, depositPercent: '150' }), 'The deposit must be between 1% and 100%.')
    assert.equal(draftProblem({ ...base, rating: '7' }), 'The rating must be between 0 and 5.')
    assert.equal(draftProblem(base), null)
})

test('one duration unit is stored, the others are cleared', () => {
    const m = servicePayload({ ...base, duration: '2', durationUnit: 'hours' }).metadata
    assert.deepEqual([m.durationMinutes, m.durationHours, m.durationDay], [null, 2, null])
})

test('a saved service round-trips through the draft', () => {
    const payload = servicePayload({
        ...base,
        slug: 'Logo Design!',
        tags: 'a, b, a',
        features: 'one\n\ntwo',
        deliveryDays: '4',
        durationUnit: 'days',
        duration: '3',
        packages: [{ ...emptyPackage(), name: 'Basic', price: '1000', deliverables: 'PNG\nSVG', revisions: '' }],
    })
    assert.equal(payload.slug, 'logo-design')
    assert.deepEqual(payload.metadata.tags, ['a', 'b'])
    assert.equal(payload.price, 1000)
    assert.equal(payload.metadata.packages[0].revisions, null)

    const draft = draftFromService({ ...payload, sku: null, metadata: payload.metadata as Record<string, unknown> })
    assert.equal(draft.deliveryDays, '4')
    assert.equal(draft.durationUnit, 'days')
    assert.equal(draft.duration, '3')
    assert.equal(draft.features, 'one\ntwo')
    assert.equal(draft.packages[0].deliverables, 'PNG\nSVG')
    assert.equal(draft.packages[0].id, payload.metadata.packages[0].id)
})

test('older services keep their images', () => {
    const draft = draftFromService({ name: 'x', slug: 'x', description: null, sku: null, is_active: true, price: 1, images: ['a.jpg'], metadata: {} })
    assert.deepEqual(draft.media.map((m) => [m.url, m.type]), [['a.jpg', 'image']])
})

test('slugs drop punctuation', () => {
    assert.equal(slugify('  Brand & Identity '), 'brand-identity')
})
