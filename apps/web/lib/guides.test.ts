// Keeps the guide registry (lib/guides.ts), the body loaders (content/guides/index.ts)
// and the .mdx files in step, and holds guide metadata to search-friendly limits.

import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import { isSlug } from "./docs-logic"
import { GUIDES } from "./guides"

const dir = join(import.meta.dirname, "../content/guides")
const mdx = readdirSync(dir).filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""))
const loaders = readFileSync(join(dir, "index.ts"), "utf8")

test("every guide has an .mdx body and a loader, and every .mdx is registered", () => {
    const slugs = GUIDES.map((g) => g.slug)
    assert.deepEqual([...mdx].sort(), [...slugs].sort())
    for (const slug of slugs) {
        assert.ok(loaders.includes(`"${slug}": () => import("./${slug}.mdx")`), `missing loader for ${slug}`)
    }
})

test("guide metadata is complete and search-friendly", () => {
    const seen = new Set<string>()
    for (const g of GUIDES) {
        assert.ok(isSlug(g.slug), `${g.slug}: not a URL slug`)
        assert.ok(!seen.has(g.slug), `${g.slug}: duplicate`)
        seen.add(g.slug)
        assert.ok(g.title.length <= 75, `${g.slug}: title is ${g.title.length} chars`)
        assert.ok(g.description.length >= 110 && g.description.length <= 165, `${g.slug}: description is ${g.description.length} chars`)
        assert.match(g.published, /^\d{4}-\d{2}-\d{2}$/)
        assert.match(g.updated, /^\d{4}-\d{2}-\d{2}$/)
        assert.ok(g.updated >= g.published, `${g.slug}: updated before published`)
        assert.ok(g.related.length > 0 && g.related.every(isSlug), `${g.slug}: related must be doc slugs`)
    }
})

test("guide bodies have no top-level heading (the page renders the <h1>)", () => {
    for (const slug of mdx) {
        const body = readFileSync(join(dir, `${slug}.mdx`), "utf8")
        assert.ok(!/^# /m.test(body), `${slug}.mdx has a "# " heading`)
    }
})

test("internal links in guide bodies point at /docs routes that exist", () => {
    const guideSlugs = new Set(GUIDES.map((g) => g.slug))
    for (const slug of mdx) {
        const body = readFileSync(join(dir, `${slug}.mdx`), "utf8")
        for (const [, path] of body.matchAll(/\]\((\/[^)#\s]*)/g)) {
            const m = /^\/docs\/guides\/([^/]+)$/.exec(path)
            if (m) assert.ok(guideSlugs.has(m[1]), `${slug}.mdx links to unknown guide ${path}`)
            else assert.match(path, /^\/docs\/[a-z0-9-]+$/, `${slug}.mdx links to ${path}`)
        }
    }
})
