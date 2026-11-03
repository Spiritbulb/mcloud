import DocsShell, { type DocsNavGroup } from "@/components/docs/docs-shell"
import { getDocs } from "@/lib/docs-data"
import { buildSearchIndex, docPath, DOCS_PATH, guidePath, GUIDES_PATH } from "@/lib/docs-logic"
import { GUIDES } from "@/lib/guides"

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
    const docs = await getDocs()
    const groups: DocsNavGroup[] = [
        {
            label: "Guides",
            href: GUIDES_PATH,
            items: GUIDES.map((g) => ({ href: guidePath(g.slug), title: g.title })),
        },
        {
            label: "Store settings",
            href: DOCS_PATH,
            items: docs.map((d) => ({ href: docPath(d.slug), title: d.title, iconId: d.iconId ?? "", beta: d.beta })),
        },
    ]
    return (
        <DocsShell groups={groups} searchIndex={buildSearchIndex(docs, GUIDES)}>
            {children}
        </DocsShell>
    )
}
