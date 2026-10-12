// Node ESM resolve hook for running *.test.ts with `node --test` (type stripping).
// Source files use bundler-style imports (extensionless, directory index, `@/` alias);
// plain Node needs the real filename. Registered by scripts/ts-resolve.mjs.
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const EXTS = ['.ts', '.tsx', '.mts', '.js', '.mjs']

function tryResolve(base) {
    if (existsSync(base) && statSync(base).isFile()) return base
    for (const e of EXTS) if (existsSync(base + e)) return base + e
    for (const e of EXTS) {
        const idx = path.join(base, 'index' + e)
        if (existsSync(idx)) return idx
    }
    return null
}

export async function resolve(specifier, context, nextResolve) {
    let base = null
    if (specifier.startsWith('@/')) {
        base = path.join(process.cwd(), specifier.slice(2))
    } else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
        base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
    }
    if (base) {
        const hit = tryResolve(base)
        if (hit) return nextResolve(pathToFileURL(hit).href, context)
    }
    try {
        return await nextResolve(specifier, context)
    } catch (err) {
        // Bare subpath imports such as `next/headers` rely on bundler extension guessing.
        if (err?.code === 'ERR_MODULE_NOT_FOUND' && !specifier.startsWith('.') && !specifier.startsWith('node:')) {
            try { return await nextResolve(specifier + '.js', context) } catch { /* fall through */ }
        }
        throw err
    }
}
