'use server'

import { getSession } from '@mcloud/auth/server'
import { updateUserProfile, deleteUser, getLoginHistory } from '@mcloud/auth/management'
import { createClient } from '@mcloud/db/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ─── Get account data ──────────────────────────────────────────────────────────

export async function getAccountData() {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const supabase = await createClient()
    const { data: user } = await supabase
        .from('users')
        .select('id, name, email, avatar_url, created_at, role')
        .eq('id', session.user.id)
        .single()

    return {
        user: {
            id: session.user.id,
            name: user?.name ?? session.user.name ?? '',
            email: user?.email ?? session.user.email ?? '',
            avatar_url: user?.avatar_url ?? session.user.avatarUrl ?? null,
            role: user?.role ?? 'customer',
            created_at: user?.created_at,
        }
    }
}

// ─── Update display name ───────────────────────────────────────────────────────

export async function updateDisplayName(formData: FormData) {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const name = (formData.get('name') as string)?.trim()
    if (!name || name.length < 2) return { error: 'Name must be at least 2 characters' }

    const supabase = await createClient()

    const { error: dbError } = await supabase
        .from('users')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', session.user.id)

    if (dbError) return { error: dbError.message }

    await updateUserProfile(session.user.id, { name })

    revalidatePath('/settings/account')
    return { success: true }
}

// ─── Update avatar ─────────────────────────────────────────────────────────────

export async function updateAvatar(formData: FormData) {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const file = formData.get('avatar') as File
    if (!file || file.size === 0) return { error: 'No file provided' }
    if (file.size > 2 * 1024 * 1024) return { error: 'Image must be under 2MB' }
    if (!file.type.startsWith('image/')) return { error: 'File must be an image' }

    const supabase = await createClient()
    const userId = session.user.id
    const ext = file.type.split('/')[1] ?? 'jpg'
    const safeUserId = userId.replace(/\|/g, '-')
    const path = `avatars/${safeUserId}.${ext}`

    const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) return { error: uploadError.message }

    const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(path)

    const { error: dbError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', userId)

    if (dbError) return { error: dbError.message }

    await updateUserProfile(userId, { avatarUrl: publicUrl })

    revalidatePath('/settings/account')
    return { success: true, avatar_url: publicUrl }
}

// ─── Get sessions (recent login activity) ──────────────────────────────────────

export async function getSessions() {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated', sessions: [] }

    const sessions = await getLoginHistory(session.user.id)
    return { sessions }
}

// ─── Delete account ────────────────────────────────────────────────────────────

export async function deleteAccount() {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const userId = session.user.id
    const supabase = await createClient()

    // 1. Delete owned stores (cascades to products, orders, members etc.)
    const { error: storesError } = await supabase
        .from('stores')
        .delete()
        .eq('owner_id', userId)

    if (storesError) return { error: storesError.message }

    // 2. Remove from stores they are a member/admin of
    await supabase.from('store_members').delete().eq('user_id', userId)

    // 3. Remove avatar from storage (try all common extensions)
    const safeUserId = userId.replace(/\|/g, '-')

    await supabase.storage
        .from('user-avatars')
        .remove([
            `avatars/${safeUserId}.jpg`,
            `avatars/${safeUserId}.jpeg`,
            `avatars/${safeUserId}.png`,
            `avatars/${safeUserId}.webp`,
        ])

    // 4. Delete user row
    const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

    if (userError) return { error: userError.message }

    // 5. Delete from the identity provider LAST (once gone, session is invalid)
    await deleteUser(userId)

    redirect('/auth/logout')
}
