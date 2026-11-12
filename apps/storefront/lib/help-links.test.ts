import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DOC_PATHS, HELP_DOCS, helpPath } from './help-links.ts'

// The docs live on web (docs_pages + content/guides) and cannot be imported here. DOC_PATHS is the
// list that existed when this was written; add to it when a new doc page or guide goes live.
test('every help link points at a doc that exists', () => {
    for (const [tab, path] of Object.entries(HELP_DOCS)) {
        assert.ok(DOC_PATHS.includes(path), `${tab} → ${path} is not a known doc`)
    }
})

test('settings tabs map to their doc, renamed ones included', () => {
    assert.equal(helpPath('products'), '/docs/products')
    assert.equal(helpPath('logistics'), '/docs/delivery')
    assert.equal(helpPath('brand'), '/docs/general')
    assert.equal(helpPath('payments'), '/docs/payments')
})

test('a tab without a doc has no help link', () => {
    assert.equal(helpPath('nope'), null)
    assert.equal(helpPath('account'), null)
})
