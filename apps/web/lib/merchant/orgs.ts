// Shared, framework-agnostic merchant org logic.
// Reusable from server actions and the mobile API (no Next-only calls).

import { createClient } from '@mcloud/db/server'
import { canManage, type Role } from './stores'

export interface UserOrg {
    id: string
    name: string
    slug: string
    logo_url: string | null
    role: Role
    canManage: boolean
}

/** Orgs the user is a member of, with their role. Mirrors the web org picker. */
export async function listUserOrgs(userId: string): Promise<UserOrg[]> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('org_members')
        .select('role, org:orgs (id, name, slug, logo_url)')
        .eq('user_id', userId)

    return (data ?? [])
        .map((m) => {
            const o = m.org as unknown as { id: string; name: string; slug: string; logo_url: string | null }
            if (!o) return null
            return {
                id: o.id,
                name: o.name,
                slug: o.slug,
                logo_url: o.logo_url ?? null,
                role: m.role,
                canManage: canManage(m.role),
            }
        })
        .filter((o): o is UserOrg => o !== null)
}
