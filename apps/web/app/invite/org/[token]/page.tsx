import { getSession } from '@mcloud/auth/server'
import { ensureUserRow } from '@mcloud/auth/callback'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import { createClient } from '@mcloud/db/server'
import { redirect } from 'next/navigation'
import { checkAccept } from '@/lib/org-invite-logic'

// Accepting an org invite: the link from the email the Members page sends. The token finds
// the invite; the signed-in account must be the address it was sent to (checkAccept).

const TOKEN_RE = /^[0-9a-f]{32,128}$/

function Message({ title, body }: { title: string; body: string }) {
    return (
        <div className="min-h-[100dvh] flex items-center justify-center px-4">
            <div className="text-center space-y-2 max-w-sm">
                <p className="text-lg font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
            </div>
        </div>
    )
}

export default async function AcceptOrgInvitePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    const session = await getSession()
    if (!session?.user) redirect(loginUrlWithReturn(`/invite/org/${token}`))

    const notFound = <Message title="Invite not found" body="This invite may have expired, been revoked or already been used. Ask for a new one." />
    if (!TOKEN_RE.test(token)) return notFound

    const supabase = await createClient()
    const { data: invite } = await supabase
        .from('org_invites')
        .select('id, org_id, email, role, expires_at, accepted_at, token, orgs(slug, name)')
        .eq('token', token)
        .maybeSingle()

    const check = checkAccept(invite, session.user.email)
    if (!check.ok) {
        if (check.reason === 'wrong_account') {
            return (
                <Message
                    title="This invite is for another account"
                    body={`It was sent to ${check.invitedEmail}. Sign out, then open the link again and sign in with that address.`}
                />
            )
        }
        if (check.reason === 'accepted') return <Message title="Invite already used" body="This invite has already been accepted." />
        if (check.reason === 'expired') return <Message title="Invite expired" body="Invites last 7 days. Ask the person who invited you to send a new one." />
        return notFound
    }

    const org = invite!.orgs as { slug: string; name: string } | null
    if (!org || !invite!.org_id || !invite!.role) return notFound
    const userId = session.user.id

    // The membership row references users(id); someone who arrived through a sign-in path that
    // has not written it yet still needs it. Idempotent.
    await ensureUserRow(session.user)

    // Claim the invite first, conditionally, so a double click or a second tab cannot use it twice.
    const { data: claimed } = await supabase
        .from('org_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite!.id)
        .is('accepted_at', null)
        .select('id')
        .maybeSingle()
    if (!claimed) return <Message title="Invite already used" body="This invite has already been accepted." />

    const { data: existing } = await supabase
        .from('org_members')
        .select('id')
        .eq('org_id', invite!.org_id)
        .eq('user_id', userId)
        .maybeSingle()

    if (!existing) {
        const { error } = await supabase
            .from('org_members')
            .insert({ org_id: invite!.org_id, user_id: userId, role: invite!.role })
        if (error) {
            // Give the invite back so it can be retried.
            await supabase.from('org_invites').update({ accepted_at: null }).eq('id', invite!.id)
            console.error('[invite/org] membership insert failed', error.message)
            return <Message title="Something went wrong" body="We couldn't add you to the organization. Please open the link again in a minute." />
        }
    }

    redirect(`/org/${org.slug}`)
}
