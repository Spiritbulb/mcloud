import { createClient } from "@mcloud/db/client"
import type { Metadata } from "next"
import DocsEditorClient from "@/components/docs-editor-client"
import type { EditablePage } from "@/components/docs-editor-client"

export const metadata: Metadata = {
    title: "Docs Editor — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

async function getDocs(): Promise<EditablePage[]> {
    const supabase = createClient()
    const { data } = await supabase
        .from("docs_pages")
        .select("data")
        .order("position", { ascending: true })
    return (data ?? []).map(row => row.data as EditablePage)
}

export default async function DocsEditorPage() {
    const initialDocs = await getDocs()
    return <DocsEditorClient initialDocs={initialDocs} />
}
