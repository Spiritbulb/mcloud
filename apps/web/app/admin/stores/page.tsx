import { createClient } from "@mcloud/db/client"
import type { Metadata } from "next"
import StoresClient from "@/components/admin/stores-client"

export const metadata: Metadata = {
    title: "Stores — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

async function getStores() {
    const supabase = createClient()
    const { data } = await supabase
        .from("stores")
        .select(`
            id, name, slug, logo_url, is_pro, is_active,
            pro_since, pro_expires_at, owner_id, currency, created_at,
            users!stores_owner_id_fkey ( name, email )
        `)
        .order("created_at", { ascending: false })

    return (data ?? []).map(row => ({
        ...row,
        owner: Array.isArray(row.users) ? row.users[0] ?? null : row.users,
    }))
}

export default async function StoresPage() {
    const stores = await getStores()
    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <StoresClient stores={stores} />
        </div>
    )
}
