import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSystemPrompt, SEARCH_NOTES_TOOL } from './prompt.ts'

test('system prompt tells the model it may use general knowledge (notes-as-reference)', () => {
  const p = buildSystemPrompt()
  assert.match(p, /Nuru/)
  assert.match(p, /general knowledge/i)
  assert.match(p, /search_notes/)
})

test('system prompt includes the in-focus note hint when provided', () => {
  const p = buildSystemPrompt({ noteInFocus: 'Photosynthesis' })
  assert.match(p, /Photosynthesis/)
})

test('search_notes tool is a valid function tool with a query string param', () => {
  assert.equal(SEARCH_NOTES_TOOL.type, 'function')
  assert.equal(SEARCH_NOTES_TOOL.function.name, 'search_notes')
  assert.equal(SEARCH_NOTES_TOOL.function.parameters.properties.query.type, 'string')
})
