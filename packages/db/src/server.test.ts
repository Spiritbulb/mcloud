// The service-role clients must never carry request cookies. An @supabase/ssr cookie client
// sends the shopper's Supabase Auth JWT when one is present, which silently demotes the
// service key to `authenticated` (RLS applies, queries fail or come back short).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Code only: the file's comments explain the old bug and name what it used.
const src = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'server.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

assert.ok(!/@supabase\/ssr/.test(src), 'server.ts must not use @supabase/ssr (cookie clients forward user JWTs)')
assert.ok(!/createServerClient/.test(src), 'server.ts must not build a cookie-backed Supabase client')
assert.ok(!/getAll\s*\(/.test(src), 'server.ts must not pass request cookies to Supabase')

const serviceKeyUses = src.match(/SUPABASE_SERVICE_ROLE_KEY/g) ?? []
assert.equal(serviceKeyUses.length, 1, 'the service key is used in exactly one place (createPublicClient)')
assert.match(src, /persistSession:\s*false/)

console.log('server client tests passed')
