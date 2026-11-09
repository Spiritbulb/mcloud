import test from 'node:test'
import assert from 'node:assert/strict'
import { arrangeStores, type AccessibleStore } from './user-stores'

const s = (id: string, name: string, lastVisitedAt: string | null = null, slug = id): AccessibleStore =>
    ({ id, slug, name, orgId: 'o', orgName: 'Org', lastVisitedAt })

test('arrangeStores dedupes stores reachable through both store and org membership', () => {
    assert.equal(arrangeStores([s('1', 'A'), s('1', 'A'), s('2', 'B')]).length, 2)
})

test('arrangeStores puts recently visited first, then alphabetical', () => {
    const out = arrangeStores([s('1', 'Zed'), s('2', 'Bee', '2026-11-01'), s('3', 'Ace', '2026-11-05'), s('4', 'Aaa')])
    assert.deepEqual(out.map((x) => x.id), ['3', '2', '4', '1'])
})

test('arrangeStores filters by name or slug, case insensitively', () => {
    const all = [s('1', 'Wanjiru Crafts', null, 'wanjiru'), s('2', 'Tea House', null, 'tea')]
    assert.deepEqual(arrangeStores(all, 'CRAFT').map((x) => x.id), ['1'])
    assert.deepEqual(arrangeStores(all, 'tea').map((x) => x.id), ['2'])
    assert.deepEqual(arrangeStores(all, '  ').map((x) => x.id).sort(), ['1', '2'])
    assert.deepEqual(arrangeStores(all, 'nope'), [])
})
