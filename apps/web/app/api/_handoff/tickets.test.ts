import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newTicketId } from './ticket-id.ts'

// safeRedirect (in tickets.ts) is a thin wrapper over sanitizeReturnTo, whose
// open-redirect behavior is already covered by auth/_return-to.test.ts and is
// re-checked end to end in the redeem runtime verification. It is not re-tested
// here because tickets.ts pulls in the DB/crypto chain that only resolves in the
// Next build, not under bare `node --test`.

test('ticket id is url-safe and long', () => {
  const id = newTicketId()
  assert.match(id, /^[A-Za-z0-9_-]+$/)
  assert.ok(id.length >= 40) // 32 bytes base64url
  assert.notEqual(newTicketId(), newTicketId())
})
