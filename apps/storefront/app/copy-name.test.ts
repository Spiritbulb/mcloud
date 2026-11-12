import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

// The product's public name is "MCloud Storefronts"; "Menengai Cloud" is the company. Older names
// ("Menengai Storefronts", "Menengai branding") confused people on the way to signing up.
const dir = path.dirname(new URL(import.meta.url).pathname)

function files(d: string): string[] {
    return readdirSync(d).flatMap((name) => {
        const p = path.join(d, name)
        if (statSync(p).isDirectory()) return files(p)
        return /\.tsx?$/.test(name) && !name.endsWith('.test.ts') ? [p] : []
    })
}

test('marketing pages use the one product name', () => {
    const hits = files(path.join(dir, '(marketing)')).flatMap((f) =>
        readFileSync(f, 'utf8').split('\n')
            .filter((line) => /Menengai Storefronts|Menengai branding/.test(line))
            .map((line) => `${path.relative(dir, f)}: ${line.trim()}`))
    assert.deepEqual(hits, [])
})

test('the landing page names the product and leads with M-PESA', () => {
    const src = readFileSync(path.join(dir, '(marketing)', 'page.tsx'), 'utf8')
    assert.match(src, /MCloud Storefronts/)
    const h1 = src.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? ''
    assert.match(h1, /M-PESA/)
})
