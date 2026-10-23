import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isFiltered, likeTerm, listHref, orIlike, pageRange, parseListQuery, queryParams, totalPages } from './list-query.ts'

const SPEC = { status: ['pending', 'paid'] } as const

test('defaults: page 1, no search, no filters', () => {
    assert.deepEqual(parseListQuery({}, SPEC), { page: 1, q: null, filters: { status: null } })
})

test('junk pages fall back, huge pages are capped', () => {
    assert.equal(parseListQuery({ page: '-3' }, SPEC).page, 1)
    assert.equal(parseListQuery({ page: 'abc' }, SPEC).page, 1)
    assert.equal(parseListQuery({ page: '0' }, SPEC).page, 1)
    assert.equal(parseListQuery({ page: '99999999' }, SPEC).page, 10_000)
})

test('filters accept only listed values, including inherited property names', () => {
    assert.equal(parseListQuery({ status: 'paid' }, SPEC).filters.status, 'paid')
    assert.equal(parseListQuery({ status: 'drop table' }, SPEC).filters.status, null)
    assert.equal(parseListQuery({ status: 'toString' }, SPEC).filters.status, null)
    assert.equal(parseListQuery({ status: 'constructor' }, SPEC).filters.status, null)
})

test('search is trimmed and length-capped; first value wins when repeated', () => {
    assert.equal(parseListQuery({ q: '  ord-12  ' }, SPEC).q, 'ord-12')
    assert.equal(parseListQuery({ q: 'x'.repeat(500) }, SPEC).q?.length, 100)
    assert.equal(parseListQuery({ q: '   ' }, SPEC).q, null)
    assert.equal(parseListQuery({ page: ['2', '5'], q: ['a', 'b'] }, SPEC).q, 'a')
    assert.equal(parseListQuery({ page: ['2', '5'] }, SPEC).page, 2)
})

test('isFiltered is true for a search or any filter', () => {
    assert.equal(isFiltered(parseListQuery({}, SPEC)), false)
    assert.equal(isFiltered(parseListQuery({ q: 'a' }, SPEC)), true)
    assert.equal(isFiltered(parseListQuery({ status: 'paid' }, SPEC)), true)
    assert.equal(isFiltered(parseListQuery({ page: '4' }, SPEC)), false)
})

test('page windows are contiguous and 50 wide; there is always at least one page', () => {
    assert.deepEqual(pageRange(1), { from: 0, to: 49 })
    assert.deepEqual(pageRange(3), { from: 100, to: 149 })
    assert.equal(totalPages(0), 1)
    assert.equal(totalPages(50), 1)
    assert.equal(totalPages(51), 2)
})

test('links omit defaults and keep the view', () => {
    assert.equal(listHref('/admin/orders', {}), '/admin/orders')
    assert.equal(listHref('/admin/orders', { page: 1, q: null, status: null }), '/admin/orders')
    assert.equal(listHref('/admin/orders', { page: 3, q: 'a b', status: 'paid' }), '/admin/orders?page=3&q=a+b&status=paid')
    const q = parseListQuery({ q: 'zed', status: 'paid', page: '2' }, SPEC)
    assert.equal(listHref('/x', { ...queryParams(q), page: 3 }), '/x?q=zed&status=paid&page=3')
})

test('search text cannot break out of an or-filter or add wildcards', () => {
    assert.equal(likeTerm('a,b'), 'a b')
    assert.equal(likeTerm('x),id.eq.1,(y'), 'x id.eq.1 y')
    assert.equal(likeTerm('50%*\\"\''), '50')
    assert.equal(likeTerm('%%%'), null)
    assert.equal(likeTerm(null), null)
    assert.equal(orIlike(['a', 'b'], 'zed'), 'a.ilike.%zed%,b.ilike.%zed%')
    assert.equal(orIlike(['a'], ',,'), null)
})
