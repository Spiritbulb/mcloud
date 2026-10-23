import { test } from 'node:test'
import assert from 'node:assert/strict'
import { auditHref, pageRange, parseAuditQuery, totalPages } from './audit-view.ts'

test('defaults to page 1 with no filters', () => {
    assert.deepEqual(parseAuditQuery({}), { page: 1, action: null, actor: null })
})

test('rejects junk pages and unknown actions', () => {
    assert.equal(parseAuditQuery({ page: '-3' }).page, 1)
    assert.equal(parseAuditQuery({ page: 'abc' }).page, 1)
    assert.equal(parseAuditQuery({ page: '99999999' }).page, 10_000)
    assert.equal(parseAuditQuery({ action: 'drop table' }).action, null)
    assert.equal(parseAuditQuery({ action: 'toString' }).action, null)
})

test('accepts a known action and trims the actor', () => {
    const q = parseAuditQuery({ action: 'user.role.set', actor: '  auth0|abc  ', page: '3' })
    assert.deepEqual(q, { page: 3, action: 'user.role.set', actor: 'auth0|abc' })
})

test('takes the first value when a param is repeated', () => {
    assert.equal(parseAuditQuery({ page: ['2', '5'] }).page, 2)
})

test('page windows are contiguous and 50 wide', () => {
    assert.deepEqual(pageRange(1), { from: 0, to: 49 })
    assert.deepEqual(pageRange(2), { from: 50, to: 99 })
})

test('total pages never drops below 1', () => {
    assert.equal(totalPages(0), 1)
    assert.equal(totalPages(50), 1)
    assert.equal(totalPages(51), 2)
})

test('links omit defaults', () => {
    assert.equal(auditHref({ page: 1 }), '/admin/audit')
    assert.equal(auditHref({ page: 2, action: 'store.status.set' }), '/admin/audit?page=2&action=store.status.set')
})
