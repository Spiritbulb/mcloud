// @route-kind: public — anyone may join the waitlist; rate limited by IP
// POST /api/waitlist  { email, kind, institutionName?, note? }
// Signed in: the account email is used and the body email ignored. Signed out: the body email, no user_id.
import { NextResponse, type NextRequest } from 'next/server'
import { SPIRITBULB_FROM, sendEmail } from '@mcloud/mail'
import { waitlistEmail } from '@mcloud/mail/templates'
import { db } from '@/lib/db'
import { currentUser } from '@/lib/session'
import { hashIp, parseWaitlistInput, withAccountEmail } from '@/lib/waitlist/waitlist-logic'

const RATE_LIMIT_MAX_ATTEMPTS = 5
const NO_STORE = { 'Cache-Control': 'no-store' }

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: NO_STORE })
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Invalid request body')
  }
  const user = await currentUser()
  const parsed = parseWaitlistInput(withAccountEmail(body, user?.email ?? null))
  if (!parsed.ok) return fail(400, parsed.error)
  const { email, kind, institutionName, note } = parsed.value

  const salt = process.env.IP_HASH_SALT
  if (!salt) return fail(500, 'Waitlist is not configured')
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ipHash = hashIp(ip, salt)

  const sql = db()
  const recent = await sql`
    select count(*)::int as n from waitlist
    where ip_hash = ${ipHash} and created_at > now() - interval '10 minutes'`
  if (((recent[0]?.n as number | undefined) ?? 0) >= RATE_LIMIT_MAX_ATTEMPTS) {
    return fail(429, 'Too many attempts. Please wait a few minutes and try again.')
  }

  let inserted
  try {
    inserted = await sql`
      insert into waitlist (email, user_id, kind, institution_name, note, ip_hash)
      values (${email}, ${user?.id ?? null}, ${kind}, ${institutionName}, ${note}, ${ipHash})
      on conflict ((lower(email)), kind) do nothing
      returning id`
  } catch (err) {
    console.error('waitlist insert failed', err)
    return fail(500, 'Could not join the waitlist. Please try again.')
  }

  if (inserted.length === 0) return NextResponse.json({ ok: true, already: true }, { headers: NO_STORE })

  // Best-effort confirmation: a failed email shouldn't undo the signup.
  await sendEmail({ from: SPIRITBULB_FROM, to: email, ...waitlistEmail({ productLabel: 'Nuru' }) })
  return NextResponse.json({ ok: true }, { headers: NO_STORE })
}
