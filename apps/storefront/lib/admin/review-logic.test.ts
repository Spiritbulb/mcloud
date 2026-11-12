import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ratingStars, reviewFilterFrom, reviewRange, reviewerName, REVIEW_PAGE_SIZE } from './review-logic.ts'

test('filter defaults to the pending queue', () => {
    assert.equal(reviewFilterFrom(undefined), 'pending')
    assert.equal(reviewFilterFrom('published'), 'published')
    assert.equal(reviewFilterFrom('all'), 'all')
    assert.equal(reviewFilterFrom("all'; drop table"), 'pending')
})

test('range is 1-based, inclusive and tolerant of junk', () => {
    assert.deepEqual(reviewRange(1), [0, REVIEW_PAGE_SIZE - 1])
    assert.deepEqual(reviewRange(3), [2 * REVIEW_PAGE_SIZE, 3 * REVIEW_PAGE_SIZE - 1])
    assert.deepEqual(reviewRange(0), reviewRange(1))
    assert.deepEqual(reviewRange(-4), reviewRange(1))
    assert.deepEqual(reviewRange('2'), reviewRange(1))
    assert.deepEqual(reviewRange(NaN), reviewRange(1))
})

test('reviewer name falls back from name to email to placeholder', () => {
    assert.equal(reviewerName({ first_name: 'Jane', last_name: 'Mwangi', email: 'j@x.co' }), 'Jane Mwangi')
    assert.equal(reviewerName({ first_name: '', last_name: '', email: 'j@x.co' }), 'j@x.co')
    assert.equal(reviewerName({ first_name: ' Jane ', last_name: null, email: null }), 'Jane')
    assert.equal(reviewerName(null), 'Customer')
})

test('stars clamp to 0-5', () => {
    assert.equal(ratingStars(4), '★★★★☆')
    assert.equal(ratingStars(9), '★★★★★')
    assert.equal(ratingStars(-1), '☆☆☆☆☆')
})
