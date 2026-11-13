import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TOPUP_FEE_KES, topupChargeKes, topupCreditCents } from './wallet-math.ts'

test('the M-PESA fee is KSh 3, added to what the person pays', () => {
    assert.equal(TOPUP_FEE_KES, 3)
    assert.equal(topupChargeKes(500), 503)
    assert.equal(topupChargeKes(20), 23)
})

test('the wallet is credited the amount typed, not the fee', () => {
    assert.equal(topupCreditCents(50300, 50000), 50000)
    assert.equal(topupCreditCents(50100, 50000), 50000)
})

test('a top-up started before the fee existed is credited in full', () => {
    assert.equal(topupCreditCents(50000, 50000), 50000)
})

test('overpaying keeps the extra; underpaying credits what was paid', () => {
    assert.equal(topupCreditCents(60300, 50000), 60000)
    assert.equal(topupCreditCents(40000, 50000), 40000)
})
