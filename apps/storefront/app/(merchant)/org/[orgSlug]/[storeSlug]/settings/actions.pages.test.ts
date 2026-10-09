import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSectionTypes } from './section-validate.ts'

const KNOWN = ['hero', 'collections', 'featured', 'all-products', 'mission', 'programs', 'impact', 'contact', 'campaigns']

test('accepts a longer list when all types are known', () => {
  const stored = [{ type: 'hero' }, { type: 'featured' }]
  const next = [{ type: 'hero' }, { type: 'featured' }, { type: 'all-products' }]
  assert.equal(validateSectionTypes(next, stored, KNOWN), true)
})

test('accepts reorder and deletion of known types', () => {
  const stored = [{ type: 'hero' }, { type: 'collections' }, { type: 'featured' }]
  const next = [{ type: 'featured' }, { type: 'hero' }]
  assert.equal(validateSectionTypes(next, stored, KNOWN), true)
})

test('rejects an unknown type not present in the stored page', () => {
  const stored = [{ type: 'hero' }]
  const next = [{ type: 'hero' }, { type: 'evil-injected' }]
  assert.equal(validateSectionTypes(next, stored, KNOWN), false)
})

test('accepts an unknown type that WAS already stored (retired registry entry)', () => {
  const stored = [{ type: 'legacy-retired' }, { type: 'hero' }]
  const next = [{ type: 'hero' }, { type: 'legacy-retired' }]
  assert.equal(validateSectionTypes(next, stored, KNOWN), true)
})
