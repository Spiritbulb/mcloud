import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newTicketId, safeRedirect } from './tickets.ts'

test('ticket id is url-safe and long', () => {
  const id = newTicketId()
  assert.match(id, /^[A-Za-z0-9_-]+$/)
  assert.ok(id.length >= 40) // 32 bytes base64url
  assert.notEqual(newTicketId(), newTicketId())
})

test('safeRedirect keeps a relative path', () => {
  assert.equal(safeRedirect('/stores/acme/orders/1'), '/stores/acme/orders/1')
})

test('safeRedirect rejects open-redirect attempts to /', () => {
  assert.equal(safeRedirect('//evil.com'), '/')
  assert.equal(safeRedirect('https://evil.com'), '/')
  assert.equal(safeRedirect('/\\evil.com'), '/')
  assert.equal(safeRedirect(undefined), '/')
})
