import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashIp, parseWaitlistInput } from './waitlist-logic'

test('parses and normalises a valid input', () => {
  assert.deepEqual(parseWaitlistInput({ email: ' A@B.CO ', kind: 'uploads' }), {
    ok: true,
    value: { email: 'a@b.co', kind: 'uploads', institutionName: null, note: null },
  })
})

test('institution needs a name; empty strings become null', () => {
  assert.equal(parseWaitlistInput({ email: 'a@b.co', kind: 'institution' }).ok, false)
  assert.equal(parseWaitlistInput({ email: 'a@b.co', kind: 'institution', institutionName: '  ' }).ok, false)
  assert.deepEqual(parseWaitlistInput({ email: 'a@b.co', kind: 'institution', institutionName: ' Uni ', note: '' }), {
    ok: true,
    value: { email: 'a@b.co', kind: 'institution', institutionName: 'Uni', note: null },
  })
})

test('rejects bad email, kind, non-objects and over-long fields', () => {
  assert.equal(parseWaitlistInput({ email: 'nope', kind: 'uploads' }).ok, false)
  assert.equal(parseWaitlistInput({ email: 'a@b.co', kind: 'admin' }).ok, false)
  assert.equal(parseWaitlistInput(null).ok, false)
  assert.equal(parseWaitlistInput('x').ok, false)
  assert.equal(parseWaitlistInput({ email: 'a@b.co', kind: 'uploads', note: 'x'.repeat(501) }).ok, false)
  assert.equal(parseWaitlistInput({ email: 'a@b.co', kind: 'uploads', note: 'x'.repeat(500) }).ok, true)
  assert.equal(parseWaitlistInput({ email: 'a'.repeat(250) + '@b.co', kind: 'uploads' }).ok, false)
  assert.equal(parseWaitlistInput({ email: 'a@b.co', kind: 'institution', institutionName: 'x'.repeat(121) }).ok, false)
  assert.equal(parseWaitlistInput({ email: 'a@b.co', kind: 'uploads', note: 5 }).ok, false)
})

test('hashIp is deterministic, salted, hex sha256', () => {
  assert.equal(hashIp('1.2.3.4', 's'), hashIp('1.2.3.4', 's'))
  assert.notEqual(hashIp('1.2.3.4', 's'), hashIp('1.2.3.4', 't'))
  assert.match(hashIp('1.2.3.4', 's'), /^[0-9a-f]{64}$/)
})
