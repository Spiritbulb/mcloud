// Phase 2b identity continuity (PROD): link each WorkOS user's external_id to the
// matching Auth0 sub (auth0|...) so existing org/store memberships keyed on the
// Auth0 id resolve after the WorkOS migration.
//
//   node --env-file=apps/web/.env.local apps/web/scripts/link-workos-externalids.mjs            # dry run
//   node --env-file=apps/web/.env.local apps/web/scripts/link-workos-externalids.mjs --apply    # write
//
// Match key: email. For each WorkOS user we find the `users` row whose email
// matches AND whose id starts with "auth0|" (the original identity that owns the
// memberships) — NOT the duplicate WorkOS-id rows created by unlinked logins.
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const WORKOS_API_KEY = process.env.WORKOS_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!WORKOS_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing WORKOS_API_KEY / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

async function workos(path, init = {}) {
  const res = await fetch(`https://api.workos.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${WORKOS_API_KEY}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`WorkOS ${path} -> ${res.status} ${await res.text()}`)
  return res.json()
}

// All WorkOS users (paginated).
async function listAllWorkosUsers() {
  const users = []
  let after
  do {
    const qs = new URLSearchParams({ limit: '100', ...(after ? { after } : {}) })
    const page = await workos(`/user_management/users?${qs}`)
    users.push(...page.data)
    after = page.list_metadata?.after
  } while (after)
  return users
}

// Map email -> the auth0|... users.id (the membership-owning identity).
async function buildAuth0EmailMap() {
  const map = new Map()
  let from = 0
  const pageSize = 1000
  for (;;) {
    const { data, error } = await sb
      .from('users')
      .select('id, email')
      .like('id', 'auth0|%')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    if (!data.length) break
    for (const u of data) {
      if (u.email) map.set(u.email.toLowerCase(), u.id)
    }
    if (data.length < pageSize) break
    from += pageSize
  }
  return map
}

async function main() {
  console.log(`\n=== Link WorkOS external_id -> auth0 sub (${APPLY ? 'APPLY' : 'DRY RUN'}) ===\n`)
  const [wsUsers, auth0ByEmail] = await Promise.all([listAllWorkosUsers(), buildAuth0EmailMap()])
  console.log(`WorkOS users: ${wsUsers.length} | Auth0 user rows: ${auth0ByEmail.size}\n`)

  let linked = 0, already = 0, noMatch = 0, conflict = 0
  for (const u of wsUsers) {
    const email = (u.email ?? '').toLowerCase()
    const auth0Id = auth0ByEmail.get(email)

    if (u.external_id) {
      // Already linked. Flag if it points somewhere unexpected.
      if (auth0Id && u.external_id !== auth0Id) {
        console.log(`CONFLICT  ${email}: external_id=${u.external_id} but auth0 row=${auth0Id}`)
        conflict++
      } else {
        already++
      }
      continue
    }
    if (!auth0Id) { noMatch++; continue }

    if (APPLY) {
      await workos(`/user_management/users/${u.id}`, { method: 'PUT', body: JSON.stringify({ external_id: auth0Id }) })
    }
    console.log(`${APPLY ? 'LINKED' : 'WOULD LINK'}  ${email}: ${u.id} -> ${auth0Id}`)
    linked++
  }

  console.log(`\n=== Summary ===`)
  console.log(`  ${APPLY ? 'linked' : 'would link'}: ${linked}`)
  console.log(`  already linked: ${already}`)
  console.log(`  no auth0 match (left as-is): ${noMatch}`)
  console.log(`  conflicts (manual review): ${conflict}`)
  if (!APPLY) console.log(`\nRe-run with --apply to write.\n`)
}

main().catch((e) => { console.error(e); process.exit(1) })
