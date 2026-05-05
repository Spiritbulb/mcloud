import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'

export default async function AcceptInvitePage({
    params,
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = await params
    const session = await auth0.getSession()

    if (!session?.user) {
        redirect(`${process.env.APP_BASE_URL}/auth/login?returnTo=/invite/${token}`)
    }

    const supabase = await createClient()

    // Fetch invite
    const { data: invite } = await supabase
        .from('store_invites')
        .select('*, stores(slug)')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

    if (!invite) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-2">
                    <p className="text-lg font-semibold">Invite not found</p>
                    <p className="text-sm text-muted-foreground">
                        This invite may have expired or already been accepted.
                    </p>
                </div>
            </div>
        )
    }

    // Accept invite — add to store_members
    await supabase.from('store_members').insert({
        store_id: invite.store_id,
        user_id: session.user.sub,
        role: invite.role,
        permissions: [],
    })

    // Mark accepted
    await supabase
        .from('store_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id)

    redirect(`/store/${invite.stores.slug}/settings`)
}