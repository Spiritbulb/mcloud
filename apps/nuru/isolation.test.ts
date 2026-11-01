import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

// Nuru shares only WorkOS identity with mcloud: no Supabase, no mcloud data packages, and only
// the standalone auth entry (the others pull in the db package and legacy linking).
const ROOT = path.resolve(import.meta.dirname)
const SKIP = new Set(['node_modules', '.next'])
// next.config.ts must name '@mcloud/auth' in transpilePackages (the standalone entry lives in that package).
const EXEMPT = new Set(['next.config.ts'])
const FORBIDDEN = /['"](@mcloud\/(db|merchant)|@supabase\/[^'"]*|@mcloud\/auth(\/(server|callback|management))?)['"]/

function sources(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) sources(p, out)
    else if (/\.(ts|tsx|mjs)$/.test(e.name) && !/\.test\.ts$/.test(e.name) && !EXEMPT.has(path.relative(ROOT, p))) out.push(p)
  }
  return out
}

test('no source file imports mcloud data packages, Supabase or the legacy auth entries', () => {
  const bad = sources(ROOT)
    .filter((f) => FORBIDDEN.test(readFileSync(f, 'utf8')))
    .map((f) => path.relative(ROOT, f))
  assert.deepEqual(bad, [])
})

test('package.json does not depend on mcloud data packages or Supabase', () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
  for (const d of ['@mcloud/db', '@mcloud/merchant', '@supabase/supabase-js']) {
    assert.ok(!deps.includes(d), `${d} must not be a dependency`)
  }
})
