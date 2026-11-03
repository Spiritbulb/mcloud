// /docs/[slug]: one store-settings reference page from docs_pages.
// Rendered on first request and cached (ISR); /api/docs revalidates on save.

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { BetaBadge, DocIcon, DocSectionView, JsonLd } from "@/components/docs/doc-blocks"
import { getDocs } from "@/lib/docs-data"
import { breadcrumbJsonLd, docJsonLd, docPath, docSeoTitle, DOCS_PATH, findDoc, guidePath } from "@/lib/docs-logic"
import { guidesForDoc } from "@/lib/guides"

export const revalidate = 3600

// Built on first visit rather than at build time, so `next build` needs no DB.
export function generateStaticParams() {
    return []
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const page = findDoc(await getDocs(), slug)
    if (!page) return {}
    const title = docSeoTitle(page)
    return {
        title,
        description: page.description,
        alternates: { canonical: docPath(page.slug) },
        openGraph: { type: "article", url: docPath(page.slug), title, description: page.description, siteName: "Menengai Cloud", locale: "en_KE" },
    }
}

export default async function DocPage({ params }: Props) {
    const { slug } = await params
    const docs = await getDocs()
    const page = findDoc(docs, slug)
    if (!page) notFound()

    const idx = docs.indexOf(page)
    const prev = docs[idx - 1]
    const next = docs[idx + 1]
    const guides = guidesForDoc(page.slug)

    return (
        <article className="max-w-4xl">
            <JsonLd data={docJsonLd(page)} />
            <JsonLd data={breadcrumbJsonLd([{ name: "Docs", path: DOCS_PATH }, { name: page.title, path: docPath(page.slug) }])} />

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                <Link href={DOCS_PATH} className="hover:text-foreground">Docs</Link>
                <ChevronRight className="w-3 h-3" aria-hidden />
                <span aria-current="page">{page.title}</span>
            </nav>

            <header className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-border">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                    <DocIcon id={page.iconId} className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-montserrat font-bold text-foreground leading-tight">{page.title}</h1>
                    {page.beta && <BetaBadge />}
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">{page.description}</p>

                {page.sections.length > 1 && (
                    <nav aria-label="On this page" className="mt-5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">On this page</p>
                        <ul className="flex flex-wrap gap-2">
                            {page.sections.map((s) => (
                                <li key={s.id}>
                                    <a href={`#${s.id}`} className="inline-block rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-secondary">
                                        {s.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}
            </header>

            <div className="space-y-10 sm:space-y-12">
                {page.sections.map((s) => <DocSectionView key={s.id} section={s} />)}
            </div>

            {guides.length > 0 && (
                <aside aria-labelledby="related-guides" className="mt-12 rounded-2xl border border-border bg-secondary/30 p-5">
                    <h2 id="related-guides" className="text-sm font-semibold text-foreground mb-3">Related guides</h2>
                    <ul className="space-y-2">
                        {guides.map((g) => (
                            <li key={g.slug}>
                                <Link href={guidePath(g.slug)} className="text-sm text-primary hover:underline">{g.title}</Link>
                            </li>
                        ))}
                    </ul>
                </aside>
            )}

            <nav aria-label="More docs" className="mt-12 pt-6 sm:pt-8 border-t border-border flex items-center justify-between gap-4 text-xs sm:text-sm">
                <div className="flex-1 min-w-0">
                    {prev && (
                        <Link href={docPath(prev.slug)} rel="prev" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                            <ChevronRight className="w-4 h-4 rotate-180 flex-shrink-0" aria-hidden />
                            <span className="truncate">{prev.title}</span>
                        </Link>
                    )}
                </div>
                <div className="flex-1 min-w-0 flex justify-end">
                    {next && (
                        <Link href={docPath(next.slug)} rel="next" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                            <span className="truncate">{next.title}</span>
                            <ChevronRight className="w-4 h-4 flex-shrink-0" aria-hidden />
                        </Link>
                    )}
                </div>
            </nav>
        </article>
    )
}
