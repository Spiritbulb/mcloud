import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { redirect } from 'next/navigation'

export default async function AcceptInvitePage({
    params,
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = await params
    const session = await getSession()

    if (!session?.user) {
        redirect(`/auth/login?returnTo=/invite/${token}`)
    }

    const supabase = await createClient()

    const { data: invite } = await supabase
        .from('store_invites')
        .select('*, stores(slug, org:orgs(slug))')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

    if (!invite) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center">
                <div className="text-center space-y-2">
                    <p className="text-lg font-semibold">Invite not found</p>
                    <p className="text-sm text-muted-foreground">
                        This invite may have expired or already been accepted.
                    </p>
                </div>
            </div>
        )
    }

    await supabase.from('store_members').insert({
        store_id: invite.store_id,
        user_id: session.user.id,
        role: invite.role,
        permissions: [],
    })

    await supabase
        .from('store_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id)

    const storeSlug = invite.stores.slug
    const orgSlug = (invite.stores.org as any)?.slug
    if (orgSlug) {
        redirect(`/org/${orgSlug}/${storeSlug}/settings`)
    }
    redirect(`/store/${storeSlug}/settings`)
}
