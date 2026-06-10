// app/api/docs/route.ts
// Protected by Auth0 session + role = 'admin' check in your users table.
// No passphrase needed — remove DOCS_EDITOR_PASSPHRASE from your env.

import { getSession } from '@/lib/auth/server'
import { createClient } from "@mcloud/db/client"
import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import type { DocPage } from "@/lib/docs"

// Service-role client — bypasses RLS, only used server-side
const adminSupabase = createClient()

async function getAdminStatus(userId: string): Promise<boolean> {
    const { data } = await adminSupabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single()

    return data?.role === "admin"
}

export async function POST(req: NextRequest) {
    // ── 1. Must be logged in ───────────────────────────────────────────────────
    const session = await getSession(req)
    if (!session?.user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // ── 2. Must be an admin in your users table ─────────────────────────────────
    const isAdmin = await getAdminStatus(session.user.id)
    if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // ── 3. Parse and validate body ──────────────────────────────────────────────
    let pages: DocPage[]
    try {
        pages = await req.json()
        if (!Array.isArray(pages)) throw new Error("Expected array")
    } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    // ── 4. Upsert to Supabase ───────────────────────────────────────────────────
    const rows = pages.map((page, i) => ({
        id: page.id,
        data: page,
        position: i,
    }))

    const { error } = await adminSupabase
        .from("docs_pages")
        .upsert(rows, { onConflict: "id" })

    if (error) {
        console.error("Supabase upsert failed:", error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ── 5. Bust ISR cache so /docs re-fetches immediately ───────────────────────
    revalidatePath("/docs")

    return NextResponse.json({ ok: true })
}