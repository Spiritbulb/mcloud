import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

// Public store pages are served from the CDN. One read of cookies() or headers() anywhere in
// a page's render tree makes the page dynamic again, and because the route is declared
// cacheable (generateStaticParams) Next then fails the request with DYNAMIC_SERVER_USAGE.
// This pins what the public tree may import. Reads there use createPublicClient().
const root = path.resolve(import.meta.dirname)
const publicTree = path.join(root, 'app/(storefront)/store/[slug]')

// settings/ is only a redirect to the merchant area; -preview is dynamic on purpose.
const EXEMPT = [`${path.sep}settings${path.sep}`, `${path.sep}-preview${path.sep}`]

// Modules a public page imports from lib/ that also touch the database.
const SHARED = ['lib/store-queries.ts', 'lib/pages.ts', 'lib/campaigns.ts']

function walk(dir: string, out: string[] = []): string[] {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) walk(p, out)
        else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p)
    }
    return out
}

const COOKIE_CLIENT = /import\s*\{[^}]*\bcreateClient\b[^}]*\}\s*from\s*'@mcloud\/db\/server'/
const REQUEST_API = /from\s*'next\/headers'/

test('public store pages never read request data', () => {
    const files = [
        ...walk(publicTree).filter((f) => !EXEMPT.some((x) => f.includes(x))),
        ...SHARED.map((f) => path.join(root, f)),
    ]
    const offenders = files
        .filter((f) => {
            const src = readFileSync(f, 'utf8')
            return COOKIE_CLIENT.test(src) || REQUEST_API.test(src)
        })
        .map((f) => path.relative(root, f))
    assert.deepEqual(offenders, [])
})

test('the home route takes no search params; only the preview route may', () => {
    const home = readFileSync(path.join(publicTree, 'page.tsx'), 'utf8')
    assert.ok(!/searchParams/.test(home), 'page.tsx must not read searchParams')
    const preview = readFileSync(path.join(publicTree, '-preview/page.tsx'), 'utf8')
    assert.match(preview, /dynamic = 'force-dynamic'/)
})

test("the tagged store lookup is not cached for less time than the pages", () => {
    // Next gives a page the SHORTEST lifetime of any cached data it reads. A smaller
    // `revalidate` in getStoreRow once cut every store page from an hour to five minutes.
    const lookup = Number(/tags: \[storeTag\(slug\)\], revalidate: (\d+)/.exec(readFileSync(path.join(root, 'lib/store-queries.ts'), 'utf8'))?.[1])
    const pages = walk(publicTree)
        .filter((f) => /page\.tsx$/.test(f) && !f.includes(`${path.sep}-preview${path.sep}`))
        .map((f) => Number(/export const revalidate = (\d+)/.exec(readFileSync(f, 'utf8'))?.[1]))
        .filter((n) => Number.isFinite(n))
    assert.ok(pages.length > 0, 'expected pages that declare revalidate')
    assert.ok(lookup >= Math.max(...pages), `lookup revalidate ${lookup} is shorter than a page's ${Math.max(...pages)}`)
})
