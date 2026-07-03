import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapNote } from './_map.ts'

test('mapNote converts snake_case row to camelCase Note with defaults', () => {
  const note = mapNote({
    id: 'n1', title: 'Bio', subject: 'Biology', source: 'text',
    original_content: 'photosynthesis', file_url: null,
    status: 'pending', created_at: '2026-07-03T00:00:00.000Z',
  })
  assert.equal(note.content, 'photosynthesis')
  assert.equal(note.fileUrl, null)
  assert.equal(note.createdAt, '2026-07-03T00:00:00.000Z')
  assert.equal(note.status, 'pending')
})

test('mapNote fills null title/subject/content with safe strings', () => {
  const note = mapNote({
    id: 'n2', title: null, subject: null, source: 'file',
    original_content: null, file_url: 'u/1.pdf',
    status: 'approved', created_at: '2026-07-03T00:00:00.000Z',
  })
  assert.equal(note.title, 'Untitled note')
  assert.equal(note.subject, 'General')
  assert.equal(note.content, '')
  assert.equal(note.fileUrl, 'u/1.pdf')
})
