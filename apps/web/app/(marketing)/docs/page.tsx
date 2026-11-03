// /docs: index of guide articles and store-settings reference pages.
// Static; /api/docs revalidates the /docs tree when the docs editor saves.

import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { BetaBadge, DocIcon, JsonLd } from "@/components/docs/doc-blocks"
import { getDocs } from "@/lib/docs-data"
import { breadcrumbJsonLd, docPath, DOCS_PATH, guidePath, GUIDES_PATH } from "@/lib/docs-logic"
import { GUIDES } from "@/lib/guides"

export const revalidate = 3600

const title = "Menengai Cloud Docs: guides and store settings help"
const description =
    "Learn how to sell online in Kenya with Menengai Cloud: step-by-step guides for M-PESA payments, domains, delivery and donations, plus help for every store setting."

export const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: DOCS_PATH },
    openGraph: { type: "website", url: DOCS_PATH, title, description, siteName: "Menengai Cloud", locale: "en_KE" },
}

export default async function DocsIndexPage() {
    const docs = await getDocs()
    return (
        <div className="space-y-12">
            <JsonLd data={breadcrumbJsonLd([{ name: "Docs", path: DOCS_PATH }])} />

            <header className="space-y-3">
                <p className="text-xs sm:text-sm font-medium text-primary uppercase tracking-widest">Documentation</p>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-montserrat font-bold text-foreground leading-[1.1]">
                    Menengai Cloud Docs
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                    Guides for selling and fundraising online in Kenya, and help for every part of your store&apos;s settings, from
                    general info to payments and beyond.
                </p>
            </header>

            <section aria-labelledby="guides-heading" className="space-y-4">
                <div className="flex items-baseline justify-between gap-4">
                    <h2 id="guides-heading" className="text-xl sm:text-2xl font-montserrat font-bold text-foreground">Guides</h2>
                    <Link href={GUIDES_PATH} className="text-sm text-primary hover:underline">All guides</Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    {GUIDES.map((g) => (
                        <Link key={g.slug} href={guidePath(g.slug)} className="group rounded-2xl border border-border bg-card p-5 hover:bg-secondary/50 transition-colors">
                            <h3 className="font-montserrat font-semibold text-foreground leading-snug">{g.title}</h3>
                            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-3">{g.description}</p>
                            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                                Read guide <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            <section aria-labelledby="settings-heading" className="space-y-4">
                <h2 id="settings-heading" className="text-xl sm:text-2xl font-montserrat font-bold text-foreground">Store settings</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {docs.map((d) => (
                        <Link key={d.slug} href={docPath(d.slug)} className="rounded-2xl border border-border bg-card p-4 hover:bg-secondary/50 transition-colors">
                            <div className="flex items-center gap-2 text-foreground">
                                <DocIcon id={d.iconId} className="w-4 h-4 text-primary" />
                                <h3 className="font-medium">{d.title}</h3>
                                {d.beta && <BetaBadge />}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{d.description}</p>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    )
}
