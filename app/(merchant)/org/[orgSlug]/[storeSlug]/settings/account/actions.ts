'use server'

import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ─── Shared: Management API token ─────────────────────────────────────────────

async function getManagementToken(): Promise<string | null> {
    const res = await fetch(`https://dev-fxs3vkboyiuzdntv.us.auth0.com/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: process.env.AUTH0_CLIENT_ID,
            client_secret: process.env.AUTH0_CLIENT_SECRET,
            audience: `https://dev-fxs3vkboyiuzdntv.us.auth0.com/api/v2/`,
        }),
        next: { revalidate: 3500 },
    })
    const { access_token } = await res.json()
    return access_token ?? null
}

// ─── Get account data ──────────────────────────────────────────────────────────

export async function getAccountData() {
    const session = await auth0.getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const supabase = await createClient()
    const { data: user } = await supabase
        .from('users')
        .select('id, name, email, avatar_url, created_at, role')
        .eq('id', session.user.sub)
        .single()

    return {
        user: {
            id: session.user.sub,
            name: user?.name ?? session.user.name ?? '',
            email: user?.email ?? session.user.email ?? '',
            avatar_url: user?.avatar_url ?? session.user.picture ?? null,
            role: user?.role ?? 'customer',
            created_at: user?.created_at,
        }
    }
}

// ─── Update display name ───────────────────────────────────────────────────────

export async function updateDisplayName(formData: FormData) {
    const session = await auth0.getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const name = (formData.get('name') as string)?.trim()
    if (!name || name.length < 2) return { error: 'Name must be at least 2 characters' }

    const supabase = await createClient()

    const { error: dbError } = await supabase
        .from('users')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', session.user.sub)

    if (dbError) return { error: dbError.message }

    const token = await getManagementToken()
    if (token) {
        await fetch(
            `https://dev-fxs3vkboyiuzdntv.us.auth0.com/api/v2/users/${encodeURIComponent(session.user.sub)}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name }),
            }
        )
    }

    revalidatePath('/settings/account')
    return { success: true }
}

// ─── Update avatar ─────────────────────────────────────────────────────────────

export async function updateAvatar(formData: FormData) {
    const session = await auth0.getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const file = formData.get('avatar') as File
    if (!file || file.size === 0) return { error: 'No file provided' }
    if (file.size > 2 * 1024 * 1024) return { error: 'Image must be under 2MB' }
    if (!file.type.startsWith('image/')) return { error: 'File must be an image' }

    const supabase = await createClient()
    const userId = session.user.sub
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

    const token = await getManagementToken()
    if (token) {
        await fetch(
            `https://dev-fxs3vkboyiuzdntv.us.auth0.com/api/v2/users/${encodeURIComponent(userId)}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ picture: publicUrl }),
            }
        )
    }

    revalidatePath('/settings/account')
    return { success: true, avatar_url: publicUrl }
}

// ─── Get sessions (via Auth0 logs) ─────────────────────────────────────────────

export async function getSessions() {
    const session = await auth0.getSession()
    if (!session?.user) return { error: 'Not authenticated', sessions: [] }

    const userId = session.user.sub
    const token = await getManagementToken()
    if (!token) return { error: 'No access token', sessions: [] }

    const res = await fetch(
        `https://dev-fxs3vkboyiuzdntv.us.auth0.com/api/v2/users/${encodeURIComponent(userId)}/logs?per_page=20&sort=date%3A-1`,
        {
            headers: { Authorization: `Bearer ${token}` },
            next: { revalidate: 0 },
        }
    )

    if (!res.ok) return { error: 'Failed to fetch logs', sessions: [] }

    const logs: any[] = await res.json()

    const loginEvents = logs.filter((l) => l.type === 's' || l.type === 'slo')

    // Deduplicate by user_agent
    const seen = new Set<string>()
    const unique = loginEvents.filter((l) => {
        const key = l.user_agent ?? 'unknown'
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })

    const sessions = unique.map((l, i) => ({
        id: l.log_id,
        device: formatDevice(l.user_agent ?? ''),
        // Auth0 already geolocates the login IP in location_info (no external,
        // unencrypted IP lookup needed — keeps user data encrypted in transit).
        location: formatLocation(l.location_info, l.ip),
        lastActive: formatRelativeTime(l.date),
        current: i === 0,
    }))

    return { sessions }
}

// ─── Revoke session (UI only — Auth0 logs are read-only on free plan) ──────────

export async function revokeSession(_sessionId: string) {
    return { success: true }
}

// ─── Delete account ────────────────────────────────────────────────────────────

export async function deleteAccount() {
    const session = await auth0.getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const userId = session.user.sub
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

    // 5. Delete from Auth0 LAST (once gone, session is invalid)
    const token = await getManagementToken()
    if (token) {
        await fetch(
            `https://dev-fxs3vkboyiuzdntv.us.auth0.com/api/v2/users/${encodeURIComponent(userId)}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
        )
    }

    redirect('/auth/logout')
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDevice(ua: string): string {
    if (!ua) return 'Unknown device'

    const browser =
        ua.includes('Edg/') ? 'Edge' :
            ua.includes('Chrome') ? 'Chrome' :
                ua.includes('Firefox') ? 'Firefox' :
                    ua.includes('Safari') ? 'Safari' : 'Browser'

    const os =
        ua.includes('iPhone') ? 'iPhone' :
            ua.includes('iPad') ? 'iPad' :
                ua.includes('Android') ? 'Android' :
                    ua.includes('Macintosh') ? 'macOS' :
                        ua.includes('Windows') ? 'Windows' :
                            ua.includes('Linux') ? 'Linux' : 'Unknown OS'

    return `${browser} on ${os}`
}

// Auth0 log entries carry a `location_info` object with geo already resolved
// (city_name, country_code, country_name). We read that instead of sending the
// user's IP to an external HTTP service, so no user data leaves over plain HTTP.
type Auth0LocationInfo = {
    city_name?: string
    country_code?: string
    country_name?: string
}

function formatLocation(loc?: Auth0LocationInfo, ip?: string): string {
    if (ip === '127.0.0.1' || ip === '::1') return 'Local'
    if (loc?.city_name && loc.country_code) return `${loc.city_name}, ${loc.country_code}`
    if (loc?.country_name) return loc.country_name
    if (loc?.country_code) return loc.country_code
    return ip ?? 'Unknown'
}

function formatRelativeTime(dateStr?: string): string {
    if (!dateStr) return 'Unknown'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
}