// Who the spiritb.uk -> MCloud handoff probably failed for, and the email we send them.
// Pure so it can be tested under bare `node --test` (see recovery-logic.test.ts).
//
// A person is "stranded" when they have signed in at the identity provider but MCloud has
// no `users` row for them. MCloud only creates that row when it sees the person (its own
// login, the mobile API, the partner code-verify, and now /auth/handoff), so for someone
// who signed in on spiritb.uk (Google especially) and never made it across, no row exists.
// Once they get through, the row appears and they drop off this list on their own.

const DAY_MS = 86_400_000

export type IdentityLike = {
    id: string
    email: string
    name?: string
    createdAt: string
    lastSignInAt: string | null
}

export type Stranded = {
    id: string
    email: string
    name: string | null
    lastSignInAt: string
    /** Signed in within `recentDays`; these are the ones worth emailing first. */
    recent: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// RFC 2606 reserved domains: seeded or test accounts, never real people.
const TEST_DOMAIN_RE = /@(?:[^@]+\.)?(?:example\.(?:com|org|net)|test|invalid|localhost)$/i

export function pickStranded(
    users: IdentityLike[],
    existingIds: ReadonlySet<string>,
    now: number,
    recentDays = 30,
): Stranded[] {
    const out: Stranded[] = []
    const seen = new Set<string>()
    for (const u of users) {
        if (!u.lastSignInAt) continue // never signed in: nothing failed for them
        if (existingIds.has(u.id)) continue // MCloud already knows them
        const email = u.email.trim().toLowerCase()
        if (!EMAIL_RE.test(email) || TEST_DOMAIN_RE.test(email)) continue
        if (seen.has(email)) continue
        const at = Date.parse(u.lastSignInAt)
        if (Number.isNaN(at)) continue
        seen.add(email)
        out.push({
            id: u.id,
            email,
            name: u.name?.trim() || null,
            lastSignInAt: u.lastSignInAt,
            recent: now - at <= recentDays * DAY_MS,
        })
    }
    return out.sort((a, b) => Date.parse(b.lastSignInAt) - Date.parse(a.lastSignInAt))
}

export const RECOVERY_LINK = 'https://spiritb.uk/go/mcloud?to=%2Forg'

export function recoveryEmail(name: string | null): { subject: string; text: string; html: string } {
    const hello = name ? `Hi ${name.split(/\s+/)[0]},` : 'Hi,'
    const subject = 'Your Menengai Cloud sign-in is fixed'
    const text = [
        hello,
        '',
        "You signed in to Spiritbulb recently, but on our side the hand-off to Menengai Cloud didn't go through, so you may have ended up on an error page. That was our fault, and it is fixed now.",
        '',
        `Pick up where you left off: ${RECOVERY_LINK}`,
        '',
        'If it still does not work, reply to this email and we will sort it out.',
        '',
        'The Spiritbulb team',
    ].join('\n')
    const html = `<p>${esc(hello)}</p>
<p>You signed in to Spiritbulb recently, but on our side the hand-off to Menengai Cloud didn't go through, so you may have ended up on an error page. That was our fault, and it is fixed now.</p>
<p><a href="${RECOVERY_LINK}">Pick up where you left off</a></p>
<p>If it still does not work, reply to this email and we will sort it out.</p>
<p>The Spiritbulb team</p>`
    return { subject, text, html }
}

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
