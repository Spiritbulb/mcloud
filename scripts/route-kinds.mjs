// API route kind registry check. Every app/api/**/route.ts starts with
//   // @route-kind: <kind> [— reason]
// and must show the matching gate in its source. Run by the *_route-kinds.test.ts files,
// so a new route without a declared, evidenced kind fails `npm test`.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

/** kind → regexes, at least one of which must match the file (null = no gate expected). */
export const KINDS = {
    admin: [/requireAdmin\(/],
    mobile: [/requireMobileUser\(|getMobileSession\(/],
    partner: [/requirePartnerSecret\(/],
    cron: [/CRON_SECRET/],
    // signed-in AND a member of the store/org the route touches
    member: [/requireStoreAccess(ById)?\(|getStoreSettingsData\(|getStoreOverview\(|canManage\(|getOrgRole\(|getStoreRole\(|store_members|org_members/],
    // the shopper's own Supabase customer session (storefront accounts)
    customer: [/getStoreCustomer\(/],
    // The kinds below have no (or a weaker) gate, so a reason after the dash is mandatory.
    // signed-in only, acting on the caller's own data or reading a global catalog
    session: [/getSession\(|withAuth\(/],
    public: null,
    webhook: null,
}

const MARKER = /^\/\/ @route-kind: ([a-z-]+)(?:\s+[—-]\s+(.+))?$/m

function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) walk(p, out)
        else if (e.name === 'route.ts') out.push(p)
    }
    return out
}

/** Returns a list of human-readable problems (empty = all routes declared and evidenced). */
export function checkRouteKinds(apiDir) {
    const problems = []
    for (const file of walk(apiDir)) {
        const src = readFileSync(file, 'utf8')
        const m = MARKER.exec(src.split('\n').slice(0, 5).join('\n'))
        const rel = path.relative(apiDir, file)
        if (!m) { problems.push(`${rel}: missing "// @route-kind: <kind>" in the first lines`); continue }
        const [, kind, reason] = m
        if (!(kind in KINDS)) { problems.push(`${rel}: unknown kind "${kind}"`); continue }
        const gate = KINDS[kind]
        const needsReason = gate === null || kind === 'session'
        if (needsReason && !reason) {
            problems.push(`${rel}: "${kind}" routes must say why, e.g. "// @route-kind: ${kind} — <reason>"`)
        }
        if (gate !== null && !gate.some((re) => re.test(src))) {
            problems.push(`${rel}: declared "${kind}" but the file never calls its gate (${gate.map(String).join(' | ')})`)
        }
    }
    return problems
}
