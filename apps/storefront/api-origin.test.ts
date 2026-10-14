import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

// One env var (NEXT_PUBLIC_API_BASE_URL) used to pick the origin for EVERY browser call, so it could
// only be right for some: set to the storefront's absolute URL, it made custom-domain checkouts call
// zones/integrations cross-origin (blocked: no CORS) and aimed payment calls at routes only web has.
// Browser code now chooses on purpose via lib/api-base.ts. This keeps the variable from creeping back.
const root = path.resolve(import.meta.dirname)
const DIRS = ['app', 'components', 'contexts', 'hooks', 'lib']

function walk(dir: string, out: string[] = []): string[] {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '.next') continue
        const p = path.join(dir, e.name)
        if (e.isDirectory()) walk(p, out)
        else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p)
    }
    return out
}

test('no code reads NEXT_PUBLIC_API_BASE_URL', () => {
    const offenders = DIRS.flatMap((d) => walk(path.join(root, d)))
        .filter((f) => /process\.env\.NEXT_PUBLIC_API_BASE_URL/.test(readFileSync(f, 'utf8')))
        .map((f) => path.relative(root, f))
    assert.deepEqual(offenders, [])
})

test('browser calls to the storefront API are same-origin; payment calls go to web', async () => {
    const { STORE_API, webApi } = await import('./lib/api-base')
    assert.equal(STORE_API, '/api')
    process.env.NEXT_PUBLIC_WEB_ORIGIN = 'https://www.mcloud.co.ke/some/path'
    assert.equal(webApi(), 'https://www.mcloud.co.ke/api')
    delete process.env.NEXT_PUBLIC_WEB_ORIGIN
    assert.equal(webApi(), 'https://mcloud.co.ke/api')
})
