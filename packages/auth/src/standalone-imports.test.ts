// Pins the standalone entry's import graph: apps that import only
// @mcloud/auth/standalone (nuru) must never reach @mcloud/db or legacy linking.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

function resolveRelative(from: string, spec: string): string {
    const base = path.resolve(path.dirname(from), spec)
    for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
        if (existsSync(c) && c.match(/\.tsx?$/)) return c
    }
    throw new Error(`cannot resolve ${spec} from ${from}`)
}

function reachable(entry: string): Map<string, string> {
    const seen = new Map<string, string>()
    const stack = [entry]
    while (stack.length) {
        const file = stack.pop()!
        if (seen.has(file)) continue
        const src = readFileSync(file, 'utf8')
        seen.set(file, src)
        // static imports/exports and dynamic import()
        const re = /(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g
        for (const m of src.matchAll(re)) {
            if (m[1].startsWith('.')) stack.push(resolveRelative(file, m[1]))
        }
    }
    return seen
}

const graph = reachable(path.join(here, 'standalone.ts'))

test('standalone graph never mentions @mcloud/db', () => {
    for (const [file, src] of graph) {
        assert.ok(!src.includes('@mcloud/db'), `${path.relative(here, file)} references @mcloud/db`)
    }
})

test('standalone graph never reaches ./index or ./legacy-link', () => {
    const files = [...graph.keys()].map((f) => path.relative(here, f))
    assert.ok(!files.includes('index.ts'), 'reaches index.ts')
    assert.ok(!files.includes('legacy-link.ts'), 'reaches legacy-link.ts')
})

test('the walk actually follows imports', () => {
    const files = [...graph.keys()].map((f) => path.relative(here, f))
    assert.ok(files.includes(path.join('providers', 'workos.ts')))
    assert.ok(files.includes(path.join('providers', 'workos-logic.ts')))
})
