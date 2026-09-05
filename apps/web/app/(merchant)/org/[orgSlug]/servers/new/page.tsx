// apps/web/app/org/[orgSlug]/servers/new/page.tsx
import { redirect, notFound } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import { createClient } from '@mcloud/db/server'
import OrgShell from '../../org-shell'
import { getOrgRole } from '@/lib/servers-db'
import NewServerForm from './new-server-form'

export default async function NewServerPage({
    params,
}: {
    params: Promise<{ orgSlug: string }>
}) {
    const { orgSlug } = await params
    const session = await getSession()
    if (!session?.user) redirect(loginUrlWithReturn(`/org/${orgSlug}/servers/new`))

    const userId = session.user.id
    const supabase = await createClient()

    const { data: org } = await supabase
        .from('orgs')
        .select('id, name, slug, logo_url, type')
        .eq('slug', orgSlug)
        .single()

    if (!org) notFound()

    const role = await getOrgRole(org.id, userId)
    if (role !== 'owner' && role !== 'admin') {
        // Not authorized to provision — send back to the servers list.
        redirect(`/org/${orgSlug}/servers`)
    }

    const { data: userRow } = await supabase
        .from('users')
        .select('name, email, avatar_url')
        .eq('id', userId)
        .single()

    const shellUser = {
        name: userRow?.name ?? session.user.name ?? 'Account',
        email: userRow?.email ?? session.user.email ?? '',
        avatarUrl: userRow?.avatar_url ?? undefined,
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 mb-6">
            {/* Hero — provisioning is the headline action now */}
            <section className="relative overflow-hidden">
                <div className="relative flex flex-col sm:flex-row items-center gap-5">
                    <div className="flex-1 min-w-0 space-y-3 text-center sm:text-left">
                        <p className="text-[12px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-primary)]">
                            {org.name}
                        </p>
                        <h1 className="text-[1.75rem] sm:text-[2rem] font-bold leading-tight text-[var(--md-sys-color-on-surface)]">
                            Pick a plan and choose an OS, or template
                        </h1>
                        <p className="text-[14px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)] max-w-md mx-auto sm:mx-0">
                            Create infrastructure for {org.name} in a few clicks. Access your servers via SSH, learn how to set it up
                        </p>
                        
                    </div>
                    <img
                        src="/digital-warehouse.svg"
                        alt=""
                        aria-hidden="true"
                        className="w-80 sm:w-72 h-auto shrink-0 select-none"
                    />
                </div>
            </section>

            <NewServerForm orgSlug={orgSlug} />
        </div>
    )
}