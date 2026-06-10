// scripts/generate-theme-manifest.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const themesRoot = path.resolve(__dirname, '../src/liquid-themes')
const outputFile = path.resolve(__dirname, '../src/lib/theme-manifest.ts')

function walkDir(dir, base = dir) {
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) return walkDir(full, base)
        if (entry.name.endsWith('.liquid')) return [path.relative(base, full).replace(/\\/g, '/')]
        return []
    })
}

fs.mkdirSync(path.dirname(outputFile), { recursive: true })

const files = walkDir(themesRoot)

const entries = files.map(file => {
    const key = file.replace(/\.liquid$/, '')
    const content = fs.readFileSync(path.join(themesRoot, file), 'utf-8')
    return `  ${JSON.stringify(key)}: ${JSON.stringify(content)},`
})

const output = `// AUTO-GENERATED — do not edit manually\nexport const themeFiles: Record<string, string> = {\n${entries.join('\n')}\n};\n`

// Write resiliently: editors/AV (e.g. VS Code's TS server) can briefly hold a
// handle on the freshly-written .ts and make the next overwrite throw EBUSY/UNKNOWN.
// Unlink first, then write, retrying a few times before giving up.
function writeWithRetry(file, data, attempts = 6) {
    for (let i = 1; i <= attempts; i++) {
        try {
            try { fs.unlinkSync(file) } catch { /* not present / not removable yet */ }
            fs.writeFileSync(file, data)
            return
        } catch (err) {
            if (i === attempts) throw err
            const wait = 250 * i
            const until = Date.now() + wait
            while (Date.now() < until) { /* brief spin so the lock can release */ }
        }
    }
}

writeWithRetry(outputFile, output)
console.log(`Generated theme manifest with ${files.length} templates.`)
