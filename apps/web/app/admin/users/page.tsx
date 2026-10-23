import { createClient } from "@mcloud/db/server"
import type { Metadata } from "next"
import UsersClient from "@/components/admin/users-client"
import { USER_FILTERS } from "@/components/admin/users-filters"
import { orIlike, pageRange, parseListQuery, totalPages } from "@mcloud/ui/kit/list-query"

export const metadata: Metadata = {
    title: "Users — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const q = parseListQuery(await searchParams, USER_FILTERS)
    const { from, to } = pageRange(q.page)
    const supabase = await createClient()

    let query = supabase
        .from("users")
        .select("id, name, email, avatar_url, role, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to)
    if (q.filters.role) query = query.eq("role", q.filters.role)
    const search = orIlike(["name", "email"], q.q)
    if (search) query = query.or(search)

    const [{ data, count, error }, { count: admins }] = await Promise.all([
        query,
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "admin"),
    ])

    const users = (data ?? []).map((u) => ({ ...u, created_at: u.created_at ?? "" }))
    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <UsersClient users={users} total={count ?? 0} admins={admins ?? 0} pages={totalPages(count ?? 0)} q={q} error={error?.message ?? null} />
        </div>
    )
}
