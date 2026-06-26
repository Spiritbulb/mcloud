import { createClient } from "@mcloud/db/client"
import type { Metadata } from "next"
import UsersClient from "@/components/admin/users-client"

export const metadata: Metadata = {
    title: "Users — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

async function getUsers() {
    const supabase = createClient()
    const { data } = await supabase
        .from("users")
        .select("id, name, email, avatar_url, role, created_at")
        .order("created_at", { ascending: false })
    return data ?? []
}

export default async function UsersPage() {
    const users = await getUsers()
    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <UsersClient users={users} />
        </div>
    )
}
