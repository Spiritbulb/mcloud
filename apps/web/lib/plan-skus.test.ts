import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planForSku } from './plan-skus.ts'

const SKUS = { hobby: 'sku.hobby.monthly', pro: 'sku.pro.monthly' }

test('maps each SKU to its plan', () => {
  assert.equal(planForSku('sku.hobby.monthly', SKUS), 'hobby')
  assert.equal(planForSku('sku.pro.monthly', SKUS), 'pro')
})

test('unknown or empty productId returns null', () => {
  assert.equal(planForSku('sku.other', SKUS), null)
  assert.equal(planForSku('', SKUS), null)
})

test('an unconfigured SKU never matches', () => {
  assert.equal(planForSku('sku.hobby.monthly', { pro: 'sku.pro.monthly' }), null)
  assert.equal(planForSku('', { hobby: '', pro: '' }), null)
})
