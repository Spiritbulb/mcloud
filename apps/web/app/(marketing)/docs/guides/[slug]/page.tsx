// /docs/guides/[slug]: a long-form guide. Body from content/guides/<slug>.mdx,
// metadata from lib/guides.ts. Fully static: only the registered slugs exist.

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, ChevronRight } from "lucide-react"
import { DocIcon, JsonLd } from "@/components/docs/doc-blocks"
import { GUIDE_BODIES } from "@/content/guides"
import { getDocs } from "@/lib/docs-data"
import { breadcrumbJsonLd, docPath, DOCS_PATH, faqJsonLd, guideJsonLd, guidePath, GUIDES_PATH } from "@/lib/docs-logic"
import { getGuide, GUIDES } from "@/lib/guides"

export const dynamicParams = false
// The related-docs links read docs_pages; refresh them like the docs themselves.
export const revalidate = 3600

export function generateStaticParams() {
    return GUIDES.map((g) => ({ slug: g.slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const guide = getGuide((await params).slug)
    if (!guide) return {}
    const url = guidePath(guide.slug)
    return {
        title: `${guide.title} | Menengai Cloud`,
        description: guide.description,
        alternates: { canonical: url },
        openGraph: {
            type: "article",
            url,
            title: guide.title,
            description: guide.description,
            siteName: "Menengai Cloud",
            locale: "en_KE",
            publishedTime: guide.published,
            modifiedTime: guide.updated,
        },
    }
}

function formatDate(iso: string) {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
}

export default async function GuidePage({ params }: Props) {
    const guide = getGuide((await params).slug)
    const load = guide && GUIDE_BODIES[guide.slug]
    if (!guide || !load) notFound()

    // Guides prerender at build; related links are optional, so a DB outage
    // drops them instead of failing the build.
    const [{ default: Body }, docs] = await Promise.all([load(), getDocs().catch(() => [])])
    const related = guide.related.flatMap((slug) => docs.filter((d) => d.slug === slug))

    return (
        <article className="max-w-3xl">
            <JsonLd data={guideJsonLd(guide)} />
            <JsonLd
                data={breadcrumbJsonLd([
                    { name: "Docs", path: DOCS_PATH },
                    { name: "Guides", path: GUIDES_PATH },
                    { name: guide.title, path: guidePath(guide.slug) },
                ])}
            />
            {guide.faq && <JsonLd data={faqJsonLd(guide.faq)} />}

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 flex-wrap">
                <Link href={DOCS_PATH} className="hover:text-foreground">Docs</Link>
                <ChevronRight className="w-3 h-3" aria-hidden />
                <Link href={GUIDES_PATH} className="hover:text-foreground">Guides</Link>
            </nav>

            <header className="mb-8 pb-6 border-b border-border">
                <h1 className="text-3xl sm:text-4xl font-montserrat font-bold text-foreground leading-[1.15]">{guide.title}</h1>
                <p className="mt-3 text-base text-muted-foreground leading-relaxed">{guide.description}</p>
                <p className="mt-4 text-xs text-muted-foreground">
                    Updated <time dateTime={guide.updated}>{formatDate(guide.updated)}</time>
                </p>
            </header>

            <Body />

            {guide.faq && (
                <section aria-labelledby="faq" className="mt-12">
                    <h2 id="faq" className="mb-4 text-xl sm:text-2xl font-montserrat font-bold text-foreground">Frequently asked questions</h2>
                    <div className="space-y-3">
                        {guide.faq.map((f) => (
                            <details key={f.q} className="group rounded-xl border border-border bg-card px-4 py-3">
                                <summary className="cursor-pointer list-none font-medium text-foreground flex items-center justify-between gap-3">
                                    <h3 className="text-sm sm:text-base">{f.q}</h3>
                                    <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform group-open:rotate-90" aria-hidden />
                                </summary>
                                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                            </details>
                        ))}
                    </div>
                </section>
            )}

            {related.length > 0 && (
                <aside aria-labelledby="related-docs" className="mt-12">
                    <h2 id="related-docs" className="mb-3 text-sm font-semibold text-foreground">Settings covered in this guide</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {related.map((d) => (
                            <li key={d.slug}>
                                <Link href={docPath(d.slug)} className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-foreground hover:bg-secondary/50">
                                    <DocIcon id={d.iconId} className="w-4 h-4 text-primary" />
                                    <span className="font-medium">{d.title}</span>
                                    <span className="text-muted-foreground truncate">: {d.description}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </aside>
            )}

            <section className="mt-12 rounded-2xl bg-[#425e7b] p-6 sm:p-8 text-white">
                <h2 className="text-xl sm:text-2xl font-montserrat font-bold">Start your site on Menengai Cloud</h2>
                <p className="mt-2 text-sm sm:text-base text-white/85 max-w-xl">
                    Free to start. Hosting, M-PESA payments and updates are handled for you.
                </p>
                <Link
                    href="/auth/sign-up"
                    className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#2c3e50] hover:opacity-90"
                >
                    Create your free site <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
            </section>
        </article>
    )
}
