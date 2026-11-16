import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

// Visitors and merchants read "non-profit", never "NGO". The vertical id `ngo` (data) is fine;
// this looks only for the word in JSX text and string literals of the storefront's pages.
function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const p = path.join(dir, name)
        if (statSync(p).isDirectory()) return files(p)
        return /\.tsx?$/.test(name) && !name.endsWith('.test.ts') ? [p] : []
    })
}

test('no user-facing NGO in storefront pages', () => {
    const dir = path.dirname(new URL(import.meta.url).pathname)
    const hits = files(dir).flatMap((f) =>
        readFileSync(f, 'utf8').split('\n')
            .map((line) => line.replace(/\/\*.*?\*\//g, '').replace(/(^|\s)\/\/.*$/, ''))
            .filter((line) => !/^\s*\*/.test(line) && /\bNGOs?\b/.test(line))
            .map((line) => `${path.relative(dir, f)}: ${line.trim()}`))
    assert.deepEqual(hits, [])
})
