import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapNote, mapMessage } from './_map.ts'

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

test('mapNote prefers the signed URL over the raw path when present', () => {
  const note = mapNote({
    id: 'n3', title: 'Doc', subject: 'History', source: 'file',
    original_content: 'text', file_url: 'user/1.pdf',
    status: 'pending', created_at: '2026-07-03T00:00:00.000Z',
    signedUrl: 'https://signed.example/1.pdf?token=abc',
  })
  assert.equal(note.fileUrl, 'https://signed.example/1.pdf?token=abc')
})

test('mapMessage passes an empty-string id through unchanged (chat fallback path)', () => {
  const msg = mapMessage({
    id: '', role: 'assistant', text: 'hi', contextNoteIds: [],
    createdAt: '2026-07-03T00:00:00.000Z',
  })
  assert.equal(msg.id, '')
  assert.deepEqual(msg.contextNoteIds, [])
})

test('mapMessage defaults a missing contextNoteIds to an empty array', () => {
  const msg = mapMessage({
    id: 'm1', role: 'user', text: 'q',
    contextNoteIds: undefined as unknown as string[],
    createdAt: '2026-07-03T00:00:00.000Z',
  })
  assert.deepEqual(msg.contextNoteIds, [])
})
