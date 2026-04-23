// app/docs/page.tsx
// Fetches from Supabase at request time, cached with ISR.
// Edit via /docs-editor → Supabase updates → page re-fetches within revalidate window.

import { createClient } from "@/lib/client"
import { cookies } from "next/headers"
import DocsClient from "@/components/docs-client"
import type { DocPage } from "@/lib/docs"

// How many seconds before Next.js re-fetches from Supabase.
// 60 = changes appear within ~1 minute. Lower = fresher, more DB reads.
export const revalidate = 60

async function getDocs(): Promise<DocPage[]> {
    const cookieStore = await cookies()
    const supabase = createClient()

    const { data, error } = await supabase
        .from("docs_pages")
        .select("data")
        .order("position", { ascending: true })

    if (error) {
        console.error("Failed to load docs from Supabase:", error.message)
        return []
    }

    return (data ?? []).map((row) => row.data as DocPage)
}

export default async function DocsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    const docs = await getDocs()
    const { page } = await searchParams
    return <DocsClient docs={docs} page={page} />
}