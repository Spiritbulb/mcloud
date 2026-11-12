import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PLAN_LIMITS, PLAN_PRICE_KES } from '@mcloud/merchant/plans'
import { STORE_FAQS, STORE_MATRIX, STORE_PLANS } from './home-storefront-data.ts'

const kes = (n: number) => `KES ${n.toLocaleString('en-KE')}`

test('storefront prices come from the plan table, not a copy', () => {
    assert.deepEqual(STORE_PLANS.map((p) => p.price), ['KES 0', kes(PLAN_PRICE_KES.hobby), kes(PLAN_PRICE_KES.pro)])
})

test('the free plan is not sold as unlimited or with automatic M-PESA', () => {
    const free = STORE_PLANS[0].features.join(' | ')
    assert.doesNotMatch(free, /Unlimited/i)
    assert.doesNotMatch(free, /STK/)
    assert.match(free, new RegExp(`${PLAN_LIMITS.free.products} products`))
})

test('the matrix says which plans get each feature', () => {
    const row = (label: string) => STORE_MATRIX.rows.find((r) => r.label === label)?.values
    assert.deepEqual(row('Automatic M-PESA (STK prompt)'), [false, true, true])
    assert.deepEqual(row('Your own domain'), [false, true, true])
    assert.deepEqual(row('Blog and content pages'), [false, true, true])
    assert.deepEqual(row('Remove our branding'), [false, false, true])
    assert.deepEqual(row('Products'), ['20', '200', 'Unlimited'])
})

test('the storefront answers use the product name and say who keeps the money', () => {
    const text = STORE_FAQS.map((f) => `${f.q} ${f.a}`).join(' ')
    assert.match(text, /don't take a cut/)
    assert.doesNotMatch(text, /\bNGO/)
})
