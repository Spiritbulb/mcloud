import assert from 'node:assert/strict'
import { firstImage, imageOrNull } from './image-logic'

assert.equal(imageOrNull('https://cdn.example.com/a.jpg'), 'https://cdn.example.com/a.jpg')
assert.equal(imageOrNull(null), null)
assert.equal(imageOrNull(undefined), null)
assert.equal(imageOrNull(''), null)
assert.equal(imageOrNull('   '), null)
// Old carts in localStorage carry the dead placeholder route.
assert.equal(imageOrNull('/api/placeholder/400/500'), null)
assert.equal(imageOrNull('/api/placeholder/200/200'), null)

assert.equal(firstImage(['https://cdn.example.com/a.jpg', 'b.jpg']), 'https://cdn.example.com/a.jpg')
assert.equal(firstImage([]), null)
assert.equal(firstImage(null), null)
assert.equal(firstImage('not-an-array'), null)

console.log('image logic tests passed')
