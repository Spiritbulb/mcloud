import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const src = readFileSync(path.join(import.meta.dirname, 'queries.ts'), 'utf8')

test('every exported query takes ownerId first', () => {
  const fns = [...src.matchAll(/export async function (\w+)\s*\(\s*([^)]*)/g)]
  assert.ok(fns.length > 0)
  for (const [, name, params] of fns) {
    assert.match(params, /^ownerId: string\b/, `${name} must take ownerId: string first`)
  }
})

test('every SQL on owned tables mentions owner_id', () => {
  const sqls = [...src.matchAll(/`([^`]*)`/g)].map((m) => m[1]).filter((s) => /\b(files|file_pages|file_outputs|asks)\b/.test(s))
  assert.ok(sqls.length > 0)
  for (const s of sqls) assert.match(s, /owner_id/, `unscoped SQL: ${s.trim().slice(0, 60)}`)
})
