import type { Metadata } from "next"
import DocsEditorClient from "@/components/docs-editor-client"

export const metadata: Metadata = {
    title: "Docs Editor — Menengai Cloud",
    robots: { index: false, follow: false },
}

export default function DocsEditorPage() {
    return <DocsEditorClient />
}
