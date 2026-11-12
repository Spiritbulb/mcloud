import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addId, MAX_PICKED_PRODUCTS, moveId, pickedIds, removeId, selectProducts } from './product-selection.ts'

const p = (id: string) => ({ id })
const all = [p('a'), p('b'), p('c'), p('d')]
const fallback = [p('a'), p('b')]

test('pickedIds keeps distinct non-empty strings and caps the list', () => {
    assert.deepEqual(pickedIds(['a', 'a', '', 3, null, 'b']), ['a', 'b'])
    assert.deepEqual(pickedIds('nope'), [])
    assert.deepEqual(pickedIds(undefined), [])
    const many = Array.from({ length: 30 }, (_, i) => `id${i}`)
    assert.equal(pickedIds(many).length, MAX_PICKED_PRODUCTS)
})

test('nothing picked falls back to the old behaviour', () => {
    assert.deepEqual(selectProducts(undefined, all, fallback), fallback)
    assert.deepEqual(selectProducts([], all, fallback), fallback)
})

test('picked products come back in the merchant order', () => {
    assert.deepEqual(selectProducts(['c', 'a'], all, fallback), [p('c'), p('a')])
})

test('a missing pick is skipped, and an all-missing list shows nothing (no silent swap)', () => {
    assert.deepEqual(selectProducts(['gone', 'b'], all, fallback), [p('b')])
    assert.deepEqual(selectProducts(['gone'], all, fallback), [])
})

test('add respects duplicates and the cap; remove and move are pure', () => {
    assert.deepEqual(addId(['a'], 'a'), ['a'])
    assert.deepEqual(addId(['a'], 'b'), ['a', 'b'])
    assert.deepEqual(addId(['a', 'b'], 'c', 2), ['a', 'b'])
    assert.deepEqual(removeId(['a', 'b'], 'a'), ['b'])
    const ids = ['a', 'b', 'c']
    assert.deepEqual(moveId(ids, 1, -1), ['b', 'a', 'c'])
    assert.deepEqual(moveId(ids, 2, 1), ['a', 'b', 'c'])
    assert.deepEqual(moveId(ids, 0, -1), ['a', 'b', 'c'])
    assert.deepEqual(ids, ['a', 'b', 'c'])
})
