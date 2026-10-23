import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAuditRow, clientIp, isAuditAction, roleAfterAdmin, snapshot } from './audit-logic.ts'

test('builds a row with nulls for the optional fields', () => {
    const row = buildAuditRow({ actor: { id: 'u1' }, action: 'store.status.set', summary: 'x' })
    assert.deepEqual(row, {
        actor_id: 'u1',
        actor_email: null,
        action: 'store.status.set',
        target_type: null,
        target_id: null,
        summary: 'x',
        before: null,
        after: null,
        ip: null,
    })
})

test('keeps before/after snapshots as plain JSON', () => {
    const row = buildAuditRow({
        actor: { id: 'u1', email: 'a@b.co' },
        action: 'user.role.set',
        targetType: 'user',
        targetId: 'u2',
        summary: 'role',
        before: { role: 'customer' },
        after: { role: 'admin', when: new Date('2026-10-23T00:00:00Z') },
    })
    assert.deepEqual(row.before, { role: 'customer' })
    assert.deepEqual(row.after, { role: 'admin', when: '2026-10-23T00:00:00.000Z' })
    assert.equal(row.actor_email, 'a@b.co')
})

test('caps the summary and replaces oversized snapshots with a marker', () => {
    const row = buildAuditRow({
        actor: { id: 'u1' },
        action: 'store.plan.grant',
        summary: 'y'.repeat(500),
        after: { blob: 'z'.repeat(20_000) },
    })
    assert.equal(row.summary.length, 300)
    assert.ok(row.summary.endsWith('…'))
    assert.equal((row.after as { truncated: boolean }).truncated, true)
})

test('snapshot survives values JSON cannot hold', () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    assert.deepEqual(snapshot(cyclic), { unserializable: true })
    assert.equal(snapshot(undefined), null)
    assert.equal(snapshot(() => 1), null)
})

test('only known actions are accepted', () => {
    assert.ok(isAuditAction('user.role.set'))
    assert.ok(!isAuditAction('toString'))
    assert.ok(!isAuditAction('nope'))
})

test('reads the first forwarded address', () => {
    const h = (m: Record<string, string>) => ({ get: (k: string) => m[k] ?? null })
    assert.equal(clientIp(h({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })), '1.2.3.4')
    assert.equal(clientIp(h({ 'x-real-ip': '9.9.9.9' })), '9.9.9.9')
    assert.equal(clientIp(h({})), null)
})

test('a revoked admin falls back to client only if they own something', () => {
    assert.equal(roleAfterAdmin(true), 'client')
    assert.equal(roleAfterAdmin(false), 'customer')
})
