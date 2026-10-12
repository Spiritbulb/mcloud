// All database access is server-side. The browser Supabase clients (`@mcloud/db/client`,
// `@mcloud/db/customer-client`) exist only for Supabase *Auth* calls, never tables. This lists
// every file that imports one so a test can pin the allowed set; a new import must be reviewed.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const SKIP = new Set(['node_modules', '.next', 'dist', '.turbo'])
const BROWSER = /@mcloud\/db\/(client|customer-client)['"]/

export function filesImportingBrowserDb(root) {
    const out = []
    ;(function walk(dir) {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
            if (SKIP.has(e.name)) continue
            const p = path.join(dir, e.name)
            if (e.isDirectory()) walk(p)
            else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.ts$/.test(e.name) && BROWSER.test(readFileSync(p, 'utf8'))) {
                out.push(path.relative(root, p).split(path.sep).join('/'))
            }
        }
    })(root)
    return out.sort()
}
