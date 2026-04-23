// scripts/generate-theme-manifest.ts
import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

const themesRoot = path.resolve('src/liquid-themes')
const outputFile = path.resolve('src/lib/theme-manifest.ts')

// Ensure the output directory exists
fs.mkdirSync(path.dirname(outputFile), { recursive: true })

const files = glob.sync('**/*.liquid', { cwd: themesRoot })

const entries = files.map(file => {
    const key = file.replace(/\.liquid$/, '').replace(/\\/g, '/')
    const content = fs.readFileSync(path.join(themesRoot, file), 'utf-8')
    return `  ${JSON.stringify(key)}: ${JSON.stringify(content)},`
})

const output = `// AUTO-GENERATED — do not edit manually\nexport const themeFiles: Record<string, string> = {\n${entries.join('\n')}\n};\n`
fs.writeFileSync(outputFile, output)
console.log(`Generated theme manifest with ${files.length} templates.`)