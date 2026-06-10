// scripts/migrate-users-to-workos.mjs
//
// One-time migration: mirror the existing Supabase `users` rows (Auth0 era — id is
// an `auth0|...` string) into WorkOS, setting each WorkOS user's `external_id` to
// that existing id. Because lib/auth/providers/workos.ts maps `AuthUser.id =
// externalId ?? workosId`, every migrated user keeps their original canonical id,
// so all FKs (store_members, org_members, orders, ...) keep resolving.
//
// Passwords are NOT migrated — auth moves to WorkOS Magic Auth (passwordless). On
// first login the user enters their email, WorkOS matches the pre-created user by
// email and sends a code. No reset emails, no hash export.
//
// Idempotent: re-running skips users already linked. Safe to run repeatedly.
//
//   node --env-file=.env.local scripts/migrate-users-to-workos.mjs              # DRY RUN (no writes)
//   node --env-file=.env.local scripts/migrate-users-to-workos.mjs --apply      # execute
//   node --env-file=.env.local scripts/migrate-users-to-workos.mjs --apply --limit=5   # only first 5

const APPLY = process.argv.includes('--apply')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const WORKOS_API_KEY = process.env.WORKOS_API_KEY

for (const [name, val] of Object.entries({ SUPABASE_URL, SERVICE_KEY, WORKOS_API_KEY })) {
    if (!val) {
        console.error(`Missing env ${name}. Run with: node --env-file=.env.local ${process.argv[1]}`)
        process.exit(1)
    }
}

async function workos(path, init = {}) {
    const res = await fetch(`https://api.workos.com${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${WORKOS_API_KEY}`,
            'Content-Type': 'application/json',
            ...(init.headers ?? {}),
        },
    })
    if (!res.ok) throw new Error(`WorkOS ${res.status} ${path}: ${await res.text()}`)
    return res.status === 204 ? null : res.json()
}

async function fetchSupabaseUsers() {
    // Only Auth0-era MERCHANT users (id like 'auth0|...'). UUID-id rows are
    // storefront CUSTOMERS (separate Supabase auth, see lib/customer-server.ts) —
    // they don't use WorkOS and some share an email with a merchant row, so they
    // must be excluded from this migration.
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/users?select=id,email,name&id=like.auth0%7C*&order=created_at.asc`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    )
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
    return res.json()
}

function splitName(name) {
    const [firstName, ...rest] = (name ?? '').trim().split(/\s+/)
    return { firstName: firstName || undefined, lastName: rest.join(' ') || undefined }
}

const main = async () => {
    const users = (await fetchSupabaseUsers()).slice(0, LIMIT)
    console.log(`${APPLY ? '🚀 APPLY' : '🔎 DRY-RUN'} — ${users.length} Supabase users\n`)

    const stats = { created: 0, linked: 0, alreadyLinked: 0, conflict: 0, skipped: 0, errors: 0 }

    for (const u of users) {
        if (!u.email) {
            console.log(`· skip (no email) ${u.id}`)
            stats.skipped++
            continue
        }
        try {
            const { data: matches } = await workos(
                `/user_management/users?email=${encodeURIComponent(u.email)}`,
            )
            const match = matches?.[0]

            if (match) {
                if (match.external_id === u.id) {
                    stats.alreadyLinked++
                } else if (!match.external_id) {
                    if (APPLY) {
                        await workos(`/user_management/users/${match.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ external_id: u.id }),
                        })
                    }
                    console.log(`↔ link  ${u.email}  → external_id=${u.id}`)
                    stats.linked++
                } else {
                    console.warn(`⚠ conflict ${u.email}: external_id already ${match.external_id} (wanted ${u.id})`)
                    stats.conflict++
                }
            } else {
                const { firstName, lastName } = splitName(u.name)
                if (APPLY) {
                    await workos(`/user_management/users`, {
                        method: 'POST',
                        body: JSON.stringify({
                            email: u.email,
                            first_name: firstName,
                            last_name: lastName,
                            email_verified: true,
                            external_id: u.id,
                        }),
                    })
                }
                console.log(`+ create ${u.email}  external_id=${u.id}`)
                stats.created++
            }
        } catch (e) {
            console.error(`✗ ${u.email}: ${e.message}`)
            stats.errors++
        }
    }

    console.log(`\n${APPLY ? 'APPLIED' : 'DRY-RUN (no writes)'} —`, stats)
    if (!APPLY) console.log('Re-run with --apply to execute.')
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
