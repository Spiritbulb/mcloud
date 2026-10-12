// Run every *.test.ts under the current workspace with Node's built-in runner.
// Usage (from a workspace dir): node ../../scripts/run-tests.mjs
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SKIP = new Set(['node_modules', '.next', 'dist', '.turbo', '.expo'])
const files = []
;(function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (SKIP.has(e.name)) continue
        const p = path.join(dir, e.name)
        if (e.isDirectory()) walk(p)
        else if (e.name.endsWith('.test.ts')) files.push(p)
    }
})('.')

if (files.length === 0) {
    console.log('no tests')
    process.exit(0)
}
const hook = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ts-resolve.mjs')
// Each file runs as its own process: `node --test <path>` treats [..]/(..) in paths as
// globs, while `node <path>` does not. node:test files still report their own results.
let failed = 0
for (const f of files.sort()) {
    const r = spawnSync(process.execPath, ['--import', hook, f], { stdio: 'pipe', encoding: 'utf8' })
    const ok = r.status === 0
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${f}`)
    if (!ok) {
        failed++
        console.log((r.stdout + r.stderr).split('\n').slice(0, 25).map((l) => '     ' + l).join('\n'))
    }
}
console.log(`\n${files.length - failed}/${files.length} test files passed`)
process.exit(failed ? 1 : 0)
