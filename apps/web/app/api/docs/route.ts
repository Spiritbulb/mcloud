// @route-kind: admin
// app/api/docs/route.ts
// Platform admins only (requireAdmin).

import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@mcloud/db/server'
import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import type { DocPage } from "@/lib/docs"
import type { Json } from '@mcloud/db/types'

export async function POST(req: NextRequest) {
    // ── 1. Must be a platform admin ─────────────────────────────────────────────
    const auth = await requireAdmin(req)
    if (auth instanceof NextResponse) return auth

    // ── 2. Service-role client: the docs_pages write must not depend on RLS ──────
    const adminSupabase = await createClient()

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
        data: page as unknown as Json,
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