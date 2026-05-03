'use server'

import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import type { MemberRow } from './utils'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function getMembers(slug: string) {
    const session = await auth0.getSession()
    if (!session?.user) return { error: 'Not authenticated', members: [], invites: [], currentRole: null }

    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', slug)
        .single()

    if (!store) return { error: 'Store not found', members: [], invites: [], currentRole: null }

    // Get members with user info
    const { data: members } = await supabase
        .from('store_members')
        .select('id, role, permissions, created_at, users(id, name, email, avatar_url)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: true })

    // Cast permissions from Json to string[]
    const safeMembers: MemberRow[] = (members ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        permissions: (m.permissions as string[] | null) ?? [],
        created_at: m.created_at,
        users: m.users as {
            id: string
            name: string | null
            email: string | null
            avatar_url: string | null
        }
    }
    ))


    // Get pending invites
    const { data: invites } = await supabase
        .from('store_invites')
        .select('id, email, role, created_at, expires_at, accepted_at')
        .eq('store_id', store.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

    // Current user's role in this store
    const currentMember = members?.find((m: any) => m.users?.id === session.user.sub)

    return {
        storeId: store.id,
        members: safeMembers,
        invites: invites ?? [],
        currentRole: safeMembers.find((m) => m.users?.id === session.user.sub)?.role ?? null,
    }
}

// ─── Invite member ─────────────────────────────────────────────────────────────

export async function inviteMember(formData: FormData) {
    const session = await auth0.getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const storeId = formData.get('storeId') as string
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    const role = formData.get('role') as string

    if (!email || !role) return { error: 'Email and role are required' }
    if (!['admin', 'staff'].includes(role)) return { error: 'Invalid role' }

    const supabase = await createClient()

    // Verify caller is owner or admin
    const { data: caller } = await supabase
        .from('store_members')
        .select('role')
        .eq('store_id', storeId)
        .eq('user_id', session.user.sub)
        .single()

    if (!caller || !['owner', 'admin'].includes(caller.role)) {
        return { error: 'You do not have permission to invite members' }
    }

    // Check if already a member
    const { data: existingMember } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

    if (existingMember) {
        const { data: alreadyMember } = await supabase
            .from('store_members')
            .select('id')
            .eq('store_id', storeId)
            .eq('user_id', existingMember.id)
            .single()

        if (alreadyMember) return { error: 'This person is already a member of this store' }
    }

    // Check for existing pending invite
    const { data: existingInvite } = await supabase
        .from('store_invites')
        .select('id')
        .eq('store_id', storeId)
        .eq('email', email)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

    if (existingInvite) return { error: 'An invite has already been sent to this email' }

    // Rate limit: max 5 invites per store per day
    const dayAgo = new Date(Date.now() - 86400000).toISOString()
    const { count } = await supabase
        .from('store_invites')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .gte('created_at', dayAgo)

    if ((count ?? 0) >= 5) {
        return { error: 'Daily invite limit reached (5/day). Try again tomorrow.' }
    }

    // Get store name for the email
    const { data: store } = await supabase
        .from('stores')
        .select('name, slug')
        .eq('id', storeId)
        .single()

    // Get inviter name
    const { data: inviter } = await supabase
        .from('users')
        .select('name')
        .eq('id', session.user.sub)
        .single()

    // Insert invite
    const { data: invite, error: inviteError } = await supabase
        .from('store_invites')
        .insert({
            store_id: storeId,
            email,
            role,
            invited_by: session.user.sub,
        })
        .select('token')
        .single()

    if (inviteError) return { error: inviteError.message }

    // Send email via Resend
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`

    await resend.emails.send({
        from: 'Menengai Cloud <noreply@menengai.cloud>',
        to: email,
        subject: `You've been invited to join ${store?.name} on Menengai Cloud`,
        html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <p style="font-size:14px;color:#6b7280;margin:0 0 24px">menengai.cloud</p>
        <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 12px">
          You're invited to join ${store?.name}
        </h1>
        <p style="font-size:15px;color:#374151;margin:0 0 24px">
          ${inviter?.name ?? 'Someone'} has invited you to join
          <strong>${store?.name}</strong> as a <strong>${role}</strong>.
        </p>
        <a href="${inviteUrl}"
           style="display:inline-block;background:#111;color:#fff;padding:12px 24px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px">
          Accept invite →
        </a>
        <p style="font-size:12px;color:#9ca3af;margin:24px 0 0">
          This invite expires in 7 days. If you weren't expecting this, you can ignore it.
        </p>
      </div>
    `,
    })

    revalidatePath(`/store/${store?.slug}/settings/members`)
    return { success: true }
}

// ─── Update member permissions ─────────────────────────────────────────────────

export async function updateMemberPermissions(
    memberId: string,
    storeId: string,
    permissions: string[]
) {
    const session = await auth0.getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const supabase = await createClient()

    // Verify caller is owner or admin
    const { data: caller } = await supabase
        .from('store_members')
        .select('role')
        .eq('store_id', storeId)
        .eq('user_id', session.user.sub)
        .single()

    if (!caller || !['owner', 'admin'].includes(caller.role)) {
        return { error: 'Not authorized' }
    }

    // Admins cannot edit owner permissions
    const { data: target } = await supabase
        .from('store_members')
        .select('role')
        .eq('id', memberId)
        .single()

    if (target?.role === 'owner' && caller.role !== 'owner') {
        return { error: 'Only owners can edit owner permissions' }
    }

    const { error } = await supabase
        .from('store_members')
        .update({ permissions })
        .eq('id', memberId)

    if (error) return { error: error.message }
    return { success: true }
}

// ─── Remove member ─────────────────────────────────────────────────────────────

export async function removeMember(memberId: string, storeId: string) {
    const session = await auth0.getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const supabase = await createClient()

    const { data: caller } = await supabase
        .from('store_members')
        .select('role')
        .eq('store_id', storeId)
        .eq('user_id', session.user.sub)
        .single()

    if (!caller || !['owner', 'admin'].includes(caller.role)) {
        return { error: 'Not authorized' }
    }

    // Cannot remove owner
    const { data: target } = await supabase
        .from('store_members')
        .select('role')
        .eq('id', memberId)
        .single()

    if (target?.role === 'owner') return { error: 'Cannot remove the store owner' }

    // Admins cannot remove other admins
    if (caller.role === 'admin' && target?.role === 'admin') {
        return { error: 'Admins cannot remove other admins' }
    }

    const { error } = await supabase
        .from('store_members')
        .delete()
        .eq('id', memberId)

    if (error) return { error: error.message }
    return { success: true }
}

// ─── Revoke invite ─────────────────────────────────────────────────────────────

export async function revokeInvite(inviteId: string, storeId: string) {
    const session = await auth0.getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const supabase = await createClient()

    const { data: caller } = await supabase
        .from('store_members')
        .select('role')
        .eq('store_id', storeId)
        .eq('user_id', session.user.sub)
        .single()

    if (!caller || !['owner', 'admin'].includes(caller.role)) {
        return { error: 'Not authorized' }
    }

    const { error } = await supabase
        .from('store_invites')
        .delete()
        .eq('id', inviteId)

    if (error) return { error: error.message }
    return { success: true }
}