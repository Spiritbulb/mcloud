// apps/web/app/api/_auth-ratelimit.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allowMagicSend, allowMagicVerify } from './_auth-ratelimit.ts'

test('send allows 3 then blocks the 4th for the same email', () => {
  const ip = '1.2.3.4'
  const email = `send-${Date.now()}@x.com`
  assert.equal(allowMagicSend(email, ip), true)
  assert.equal(allowMagicSend(email, `${ip}-a`), true)
  assert.equal(allowMagicSend(email, `${ip}-b`), true)
  assert.equal(allowMagicSend(email, `${ip}-c`), false) // email cap hit
})

test('verify allows 5 then blocks the 6th for the same email', () => {
  const email = `verify-${Date.now()}@x.com`
  for (let i = 0; i < 5; i++) {
    assert.equal(allowMagicVerify(email, `ip-${i}`), true)
  }
  assert.equal(allowMagicVerify(email, 'ip-x'), false)
})
