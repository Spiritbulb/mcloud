'use server'

import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@mcloud/mail'
import { inviteEmail } from '@mcloud/mail/templates'

export type OrgMemberRow = {
    id: string
    role: string
    created_at: string | null
    users: {
        id: string
        name: string | null
        email: string | null
        avatar_url: string | null
    }
}

export async function getOrgMembers(orgSlug: string) {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated', members: [], invites: [], currentRole: null }

    const supabase = await createClient()

    const { data: org } = await supabase
        .from('orgs')
        .select('id, name')
        .eq('slug', orgSlug)
        .single()

    if (!org) return { error: 'Org not found', members: [], invites: [], currentRole: null }

    const { data: members } = await supabase
        .from('org_members')
        .select('id, role, created_at, users(id, name, email, avatar_url)')
        .eq('org_id', org.id)
        .order('created_at', { ascending: true })

    const safeMembers: OrgMemberRow[] = (members ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        created_at: m.created_at,
        users: m.users as OrgMemberRow['users'],
    }))

    const { data: invites } = await supabase
        .from('org_invites')
        .select('id, email, role, created_at, expires_at')
        .eq('org_id', org.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

    return {
        orgId: org.id,
        orgName: org.name,
        members: safeMembers,
        invites: invites ?? [],
        currentRole: safeMembers.find((m) => m.users?.id === session.user.id)?.role ?? null,
    }
}

export async function inviteOrgMember(formData: FormData) {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const orgId = formData.get('orgId') as string
    const orgSlug = formData.get('orgSlug') as string
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    const role = formData.get('role') as string

    if (!email || !role) return { error: 'Email and role are required' }
    if (!['admin', 'member'].includes(role)) return { error: 'Invalid role' }

    const supabase = await createClient()

    const { data: caller } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', session.user.id)
        .maybeSingle()

    if (!caller || !['owner', 'admin'].includes(caller.role)) {
        return { error: 'You do not have permission to invite members' }
    }

    const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
    if (existingUser) {
        const { data: alreadyMember } = await supabase
            .from('org_members')
            .select('id')
            .eq('org_id', orgId)
            .eq('user_id', existingUser.id)
            .maybeSingle()
        if (alreadyMember) return { error: 'This person is already a member' }
    }

    const { data: existingInvite } = await supabase
        .from('org_invites')
        .select('id')
        .eq('org_id', orgId)
        .eq('email', email)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

    if (existingInvite) return { error: 'An invite has already been sent to this email' }

    const dayAgo = new Date(Date.now() - 86400000).toISOString()
    const { count } = await supabase
        .from('org_invites')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', dayAgo)

    if ((count ?? 0) >= 10) return { error: 'Daily invite limit reached (10/day).' }

    const { data: org } = await supabase.from('orgs').select('name, slug').eq('id', orgId).single()
    const { data: inviter } = await supabase.from('users').select('name').eq('id', session.user.id).single()

    const { data: invite, error: inviteError } = await supabase
        .from('org_invites')
        .insert({ org_id: orgId, email, role, invited_by: session.user.id })
        .select('token')
        .single()

    if (inviteError) return { error: inviteError.message }
const appUrl = process.env.NEXT_PUBLIC_APP_URL
if (!appUrl) return { error: 'App URL is not configured' }

const inviteUrl = `${appUrl}/invite/org/${invite.token}`
    const sent = await sendEmail({
        to: email,
        ...inviteEmail({ targetName: org?.name ?? 'an organization', inviterName: inviter?.name, role, url: inviteUrl }),
    })

    revalidatePath(`/org/${orgSlug}/members`)
    if (!sent.ok) return { error: 'The invite was saved, but the email could not be sent. Please try again later.' }
    return { success: true }
}

export async function updateOrgMemberRole(memberId: string, orgId: string, orgSlug: string, role: string) {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    if (!['admin', 'member'].includes(role)) return { error: 'Invalid role' }

    const supabase = await createClient()

    const { data: caller } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', session.user.id)
        .maybeSingle()

    if (!caller || caller.role !== 'owner') return { error: 'Only owners can change roles' }

    const { data: target } = await supabase.from('org_members').select('role').eq('id', memberId).single()
    if (target?.role === 'owner') return { error: 'Cannot change the owner role' }

    const { error } = await supabase.from('org_members').update({ role }).eq('id', memberId)
    if (error) return { error: error.message }

    revalidatePath(`/org/${orgSlug}/members`)
    return { success: true }
}

export async function removeOrgMember(memberId: string, orgId: string, orgSlug: string) {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const supabase = await createClient()

    const { data: caller } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', session.user.id)
        .maybeSingle()

    if (!caller || !['owner', 'admin'].includes(caller.role)) return { error: 'Not authorized' }

    const { data: target } = await supabase.from('org_members').select('role').eq('id', memberId).single()
    if (target?.role === 'owner') return { error: 'Cannot remove the org owner' }
    if (caller.role === 'admin' && target?.role === 'admin') return { error: 'Admins cannot remove other admins' }

    const { error } = await supabase.from('org_members').delete().eq('id', memberId)
    if (error) return { error: error.message }

    revalidatePath(`/org/${orgSlug}/members`)
    return { success: true }
}

export async function revokeOrgInvite(inviteId: string, orgId: string, orgSlug: string) {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const supabase = await createClient()

    const { data: caller } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', session.user.id)
        .maybeSingle()

    if (!caller || !['owner', 'admin'].includes(caller.role)) return { error: 'Not authorized' }

    const { error } = await supabase.from('org_invites').delete().eq('id', inviteId)
    if (error) return { error: error.message }

    revalidatePath(`/org/${orgSlug}/members`)
    return { success: true }
}
