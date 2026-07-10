import assert from 'node:assert/strict'
import { buildDonationLine, buildDonationMetadata } from './donate-logic'

const campaign = { id: 'water', title: 'Clean Water', image: 'https://x/w.jpg' }

// donation line: single line, no product, price = amount, qty 1
const line = buildDonationLine(campaign, 750)
assert.equal(line.product_id, null, 'donation line has no product')
assert.equal(line.price, 750)
assert.equal(line.quantity, 1)
assert.equal(line.title, 'Clean Water')
assert.equal(line.image_url, 'https://x/w.jpg')

// metadata tags the donation + campaign, includes dedication only when present
assert.deepEqual(buildDonationMetadata('water', 'In memory of Jane'), {
  isDonation: true, campaignId: 'water', dedication: 'In memory of Jane',
})
assert.deepEqual(buildDonationMetadata('water', undefined), {
  isDonation: true, campaignId: 'water',
})

console.log('donate-logic.test.ts: all assertions passed')
