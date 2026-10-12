// The storefront renders from src/themes-manifest.ts (a generated copy of themes/**/*.liquid),
// so editing a .liquid file without regenerating it changes nothing in production.
// Fix a failure here with:  npm run gen:manifest -w @mcloud/liquid
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { themeFiles } from './themes-manifest.ts'

const themesRoot = path.resolve(import.meta.dirname, '../themes')
const norm = (s: string) => s.replace(/\r\n/g, '\n') // the committed manifest may have been generated on Windows

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.liquid')) out.push(p)
  }
  return out
}

test('themes-manifest.ts matches themes/**/*.liquid', () => {
  const onDisk = new Map(
    walk(themesRoot).map((f) => [path.relative(themesRoot, f).replace(/\.liquid$/, '').split(path.sep).join('/'), norm(readFileSync(f, 'utf8'))]),
  )
  const inManifest = new Map(Object.entries(themeFiles).map(([k, v]) => [k, norm(v)]))

  assert.deepEqual([...inManifest.keys()].sort(), [...onDisk.keys()].sort(), 'template set differs: run gen:manifest')
  const stale = [...onDisk].filter(([k, v]) => inManifest.get(k) !== v).map(([k]) => k)
  assert.deepEqual(stale, [], `stale templates in the manifest: run gen:manifest`)
})
