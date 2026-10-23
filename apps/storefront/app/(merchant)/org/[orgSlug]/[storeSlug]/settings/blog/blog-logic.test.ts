import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emptyForm, estimateReadingTime, formChanged, formFromPost, nextSlug, slugify, splitTags } from './blog-logic.ts'

test('slugs are lowercase, hyphenated and trimmed of stray hyphens', () => {
    assert.equal(slugify('  Hair Care: 5 Tips! '), 'hair-care-5-tips')
    assert.equal(slugify('a -- b'), 'a-b')
    assert.equal(slugify('-Leading and trailing-'), 'leading-and-trailing')
})

test('reading time is at least a minute', () => {
    assert.equal(estimateReadingTime(''), 1)
    assert.equal(estimateReadingTime('word '.repeat(600)), 3)
})

test('tags split on commas, trimmed and de-duplicated', () => {
    assert.deepEqual(splitTags(' style, tips ,, style '), ['style', 'tips'])
})

test('the slug follows the title until it is edited by hand', () => {
    assert.equal(nextSlug({ id: null, title: '', slug: '' }, 'New Post'), 'new-post')
    assert.equal(nextSlug({ id: 'p1', title: 'Old', slug: 'old' }, 'Newer'), 'newer')
    assert.equal(nextSlug({ id: 'p1', title: 'Old', slug: 'custom-url' }, 'Newer'), 'custom-url')
})

test('a post round-trips through the form, featured included', () => {
    const form = formFromPost({
        id: 'p1', title: 'T', slug: 't', excerpt: null, content: 'c', cover_image: null, author_id: null,
        tags: ['a', 'b'], is_published: true, reading_time_minutes: 2, metadata: { featured: true },
    })
    assert.equal(form.tags, 'a, b')
    assert.equal(form.featured, true)
    assert.equal(formFromPost({ ...form, id: 'p1', excerpt: '', cover_image: '', tags: [], metadata: null }).featured, false)
})

test('changes are detected, but not tag spacing or the derived reading time', () => {
    const saved = { ...emptyForm(), title: 'T', tags: 'a, b' }
    assert.equal(formChanged(saved, { ...saved, tags: 'a,b', reading_time_minutes: 9 }), false)
    assert.equal(formChanged(saved, { ...saved, title: 'T2' }), true)
    assert.equal(formChanged(saved, { ...saved, featured: true }), true)
})
